import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { answerCatalogQuestion } from "@/lib/catalog/answer";
import { sendWhatsAppText } from "@/lib/meta/client";
import { decryptCredential } from "@/lib/meta/credentials";

// At-most-once automatic outbound attempts. An ambiguous Meta/network response
// is NEVER replayed automatically: instead it requires operator reconciliation.
// An exactly-once delivery claim would be incorrect without provider idempotency.
const MAX_PREPARE_ATTEMPTS = 5;
const CLAIM_MS = 120_000;

export type WhatsAppInbound = {
  messageId: string;
  businessId: string;
  from: string;
  customerName?: string | null;
  text: string;
};

type Sender = typeof sendWhatsAppText;
type Outcome = "processed" | "duplicate" | "deferred" | "retryable" | "needs_review";
const due = (date: Date | null, now: Date) => !date || date <= now;
const problem = (cause: unknown) =>
  cause instanceof Error ? cause.name.slice(0, 80) : "unrecognized_error";

export function deliveryOutcome(status: string, deliveryState: string): Outcome {
  if (status === "processed" && deliveryState === "sent") return "duplicate";
  if (status === "needs_review" || deliveryState === "uncertain") return "needs_review";
  if (status === "failed") return "retryable";
  return "deferred";
}

// Called only by the official signed webhook or an explicitly authorized
// Preview-only recovery operation. No autonomous production activation.
export async function handleWhatsAppInbound(
  input: WhatsAppInbound,
  sender: Sender = sendWhatsAppText,
): Promise<Outcome> {
  if (!input.messageId || input.messageId.length > 256 ||
      !input.businessId || !input.from || input.from.length > 40 ||
      !input.text.trim() || input.text.length > 4000) {
    throw new Error("Invalid inbound WhatsApp event.");
  }

  let event = await db.webhookEvent.findUnique({ where: { eventId: input.messageId } });
  if (!event) {
    try {
      event = await db.webhookEvent.create({
        data: {
          eventId: input.messageId, businessId: input.businessId,
          fromNumber: input.from,
          customerName: input.customerName?.slice(0, 150) || null,
          bodyText: input.text, status: "received", deliveryState: "pending",
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
      event = await db.webhookEvent.findUnique({ where: { eventId: input.messageId } });
    }
  }
  if (!event) return "retryable";
  // A provider message ID cannot migrate between tenants/senders.
  if (event.businessId !== input.businessId || event.fromNumber !== input.from) {
    return "needs_review";
  }
  const now = new Date();

  if (event.status === "processed" && event.deliveryState === "sent") return "duplicate";
  if (event.status === "needs_review" || event.deliveryState === "uncertain") return "needs_review";

  // A process crashed after reserving an outbound attempt. It may already
  // have reached Meta; a retry would risk a second WhatsApp message.
  if (event.deliveryState === "sending") {
    if (due(event.claimExpiresAt, now)) {
      await db.webhookEvent.updateMany({
        where: { eventId: input.messageId, deliveryState: "sending", claimExpiresAt: { lte: now } },
        data: { status: "needs_review", deliveryState: "uncertain",
          lastError: "Outbound send was interrupted. Manual provider reconciliation required." },
      });
      return "needs_review";
    }
    return "deferred";
  }

  if (event.status === "preparing") {
    if (!due(event.claimExpiresAt, now)) return "deferred";
    await db.webhookEvent.updateMany({
      where: { eventId: input.messageId, status: "preparing", claimExpiresAt: { lte: now } },
      data: { status: "failed", lastError: "Expired preparation lease; safe to retry." },
    });
  }

  if (event.deliveryState === "pending") {
    const claim = await db.webhookEvent.updateMany({
      where: {
        eventId: input.messageId, deliveryState: "pending",
        status: { in: ["received", "failed"] },
        attemptCount: { lt: MAX_PREPARE_ATTEMPTS },
        OR: [{ claimExpiresAt: null }, { claimExpiresAt: { lte: now } }],
      },
      data: {
        status: "preparing", claimExpiresAt: new Date(now.getTime() + CLAIM_MS),
        attemptCount: { increment: 1 }, lastError: null,
      },
    });
    if (claim.count !== 1) {
      const current = await db.webhookEvent.findUnique({ where: { eventId: input.messageId } });
      if (current?.attemptCount && current.attemptCount >= MAX_PREPARE_ATTEMPTS) {
        await db.webhookEvent.updateMany({
          where: { eventId: input.messageId, deliveryState: "pending", status: "failed" },
          data: { status: "needs_review", lastError: "Preparation retries exhausted." },
        });
        return "needs_review";
      }
      return "deferred";
    }

    try {
      const business = await db.business.findUnique({
        where: { id: input.businessId }, include: { botConfig: true },
      });
      if (!business || business.status !== "active") throw new Error("Business is not active.");
      const customer = await db.customer.findUnique({
        where: { businessId_whatsappNumber: {
          businessId: input.businessId, whatsappNumber: input.from,
        } }, select: { id: true },
      });
      const activeConversation = customer
        ? await db.conversation.findFirst({
            where: {
              businessId: input.businessId, customerId: customer.id,
              status: { in: ["open", "waiting", "human_required"] },
            },
            orderBy: { lastMessageAt: "desc" },
          })
        : null;

      const requiresHandoff = business.botConfig?.active === false ||
        Boolean(activeConversation?.assignedToHuman ||
                activeConversation?.status === "human_required");
      const calculated = requiresHandoff
        ? {
            reply: business.botConfig?.humanHandoffMessage ||
              "Una persona del negocio continuará esta conversación.",
            requiresHuman: true,
          }
        : await answerCatalogQuestion({ businessId: input.businessId, query: input.text });

      const reply = calculated.reply.trim().slice(0, 4096);
      if (!reply) throw new Error("No valid response was prepared.");
      const requiresHuman = Boolean(calculated.requiresHuman);

      await db.$transaction(async tx => {
        const client = await tx.customer.upsert({
          where: { businessId_whatsappNumber: {
            businessId: input.businessId, whatsappNumber: input.from,
          } },
          update: input.customerName ? { name: input.customerName } : {},
          create: {
            businessId: input.businessId, whatsappNumber: input.from,
            name: input.customerName ?? null,
          },
        });
        let conversation = await tx.conversation.findFirst({
          where: {
            businessId: input.businessId, customerId: client.id,
            status: { in: ["open", "waiting", "human_required"] },
          }, orderBy: { lastMessageAt: "desc" },
        });
        if (!conversation) {
          conversation = await tx.conversation.create({
            data: { businessId: input.businessId, customerId: client.id, status: "open" },
          });
        }
        // This uniqueness constraint prevents duplicate inbound persistence.
        await tx.message.create({
          data: {
            conversationId: conversation.id, direction: "inbound",
            content: input.text, whatsappMessageId: input.messageId,
          },
        });
        await tx.webhookEvent.update({
          where: { eventId: input.messageId },
          data: {
            status: "ready", deliveryState: "ready", claimExpiresAt: null,
            replyText: reply, conversationId: conversation.id,
            requiresHuman, lastError: null,
          },
        });
        await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            ...(requiresHuman ? { status: "human_required", assignedToHuman: true } : {}),
          },
        });
      });
    } catch (error) {
      // Existing inbound persisted by an older handler? Never create a second reply.
      const collision = error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      await db.webhookEvent.updateMany({
        where: { eventId: input.messageId, status: "preparing", deliveryState: "pending" },
        data: collision
          ? { status: "needs_review",
              lastError: "Inbound ID already exists without a confirmed outbound state." }
          : { status: "failed", claimExpiresAt: null,
              lastError: "Reply preparation failed: " + problem(error) },
      });
      return collision ? "needs_review" : "retryable";
    }
  }

  const prepared = await db.webhookEvent.findUnique({
    where: { eventId: input.messageId },
  });
  if (!prepared || prepared.status !== "ready" || prepared.deliveryState !== "ready" ||
      !prepared.replyText || !prepared.conversationId) {
    return prepared ? deliveryOutcome(prepared.status, prepared.deliveryState) : "retryable";
  }

  // Fail safely before reserving a remote attempt when credentials are absent.
  const business = await db.business.findUnique({
    where: { id: input.businessId },
    select: {
      status: true, whatsappPhoneNumberId: true,
      whatsappAccessTokenEncrypted: true,
    },
  });
  if (!business || business.status !== "active" ||
      !business.whatsappPhoneNumberId || !business.whatsappAccessTokenEncrypted) {
    await db.webhookEvent.updateMany({
      where: { eventId: input.messageId, status: "ready", deliveryState: "ready" },
      data: { lastError: "WhatsApp connector is not configured; no send attempted." },
    });
    return "retryable";
  }

  let accessToken: string;
  try {
    accessToken = decryptCredential(business.whatsappAccessTokenEncrypted);
  } catch {
    await db.webhookEvent.updateMany({
      where: { eventId: input.messageId, status: "ready", deliveryState: "ready" },
      data: { lastError: "Could not decrypt connector credentials; no send attempted." },
    });
    return "retryable";
  }

  const reserved = await db.webhookEvent.updateMany({
    where: { eventId: input.messageId, status: "ready", deliveryState: "ready" },
    data: {
      status: "sending", deliveryState: "sending",
      claimExpiresAt: new Date(Date.now() + CLAIM_MS),
    },
  });
  if (!reserved.count) return "deferred";

  try {
    const response = await sender(
      business.whatsappPhoneNumberId, input.from, prepared.replyText, accessToken,
    );
    const entry = Array.isArray(response.messages) ? response.messages[0] : null;
    const remoteId = entry && typeof entry === "object" && "id" in entry &&
      typeof entry.id === "string" ? entry.id : null;
    if (!remoteId) throw new Error("Meta response lacks an accepted outbound message ID.");

    await db.$transaction(async tx => {
      await tx.message.create({
        data: {
          conversationId: prepared.conversationId!,
          direction: "outbound", content: prepared.replyText!,
          whatsappMessageId: remoteId,
        },
      });
      await tx.webhookEvent.update({
        where: { eventId: input.messageId },
        data: {
          status: "processed", deliveryState: "sent",
          outboundMessageId: remoteId, claimExpiresAt: null,
          lastError: null, processedAt: new Date(),
        },
      });
    });
    return "processed";
  } catch (error) {
    // Network errors and DB errors after a Meta response can be ambiguous.
    // Do not send again: human reconciliation is the only safe next step.
    await db.webhookEvent.updateMany({
      where: { eventId: input.messageId, status: "sending" },
      data: {
        status: "needs_review", deliveryState: "uncertain",
        lastError: "Outbound state uncertain: " + problem(error),
        claimExpiresAt: null,
      },
    });
    return "needs_review";
  }
}
