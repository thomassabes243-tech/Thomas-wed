import { db } from "@/lib/db";
import { answerCatalogQuestion } from "@/lib/catalog/answer";
import { sendWhatsAppText } from "@/lib/meta/client";
import { decryptCredential } from "@/lib/meta/credentials";

export type ProcessInboundInput = {
  businessId: string;
  from: string;
  text: string;
  customerName?: string | null;
  whatsappMessageId?: string | null;
  sendToWhatsApp?: boolean;
};

export async function processInboundMessage(input: ProcessInboundInput) {
  const text = input.text.trim();
  if (!text) throw new Error("Mensaje vacío.");

  const business = await db.business.findUnique({
    where: { id: input.businessId },
    include: { botConfig: true },
  });
  if (!business) throw new Error("Negocio no encontrado.");

  if (input.whatsappMessageId) {
    const duplicate = await db.message.findUnique({
      where: { whatsappMessageId: input.whatsappMessageId },
      select: { id: true },
    });
    if (duplicate) return { duplicate: true };
  }

  const customer = await db.customer.upsert({
    where: {
      businessId_whatsappNumber: {
        businessId: input.businessId,
        whatsappNumber: input.from,
      },
    },
    update: input.customerName ? { name: input.customerName } : {},
    create: {
      businessId: input.businessId,
      whatsappNumber: input.from,
      name: input.customerName ?? null,
    },
  });

  let conversation = await db.conversation.findFirst({
    where: {
      businessId: input.businessId,
      customerId: customer.id,
      status: { in: ["open", "waiting", "human_required"] },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        businessId: input.businessId,
        customerId: customer.id,
        status: "open",
      },
    });
  }

  await db.message.create({
    data: {
      conversationId: conversation.id,
      direction: "inbound",
      content: text,
      whatsappMessageId: input.whatsappMessageId ?? null,
    },
  });

  const botActive = business.botConfig?.active ?? true;
  let reply = "";
  let requiresHuman = false;

  if (!botActive) {
    reply =
      business.botConfig?.humanHandoffMessage ||
      "En este momento la atención automática está pausada. Una persona del negocio continuará la conversación.";
    requiresHuman = true;
  } else if (conversation.assignedToHuman || conversation.status === "human_required") {
    reply =
      business.botConfig?.humanHandoffMessage ||
      "Tu consulta ya fue enviada a una persona del negocio.";
    requiresHuman = true;
  } else {
    const answer = await answerCatalogQuestion({
      businessId: input.businessId,
      query: text,
    });
    reply = answer.reply;
    requiresHuman = answer.requiresHuman;
  }

  await db.message.create({
    data: {
      conversationId: conversation.id,
      direction: "outbound",
      content: reply,
    },
  });

  conversation = await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      status: requiresHuman ? "human_required" : "open",
      assignedToHuman: requiresHuman,
    },
  });

  if (input.sendToWhatsApp && business.whatsappPhoneNumberId) {
    if (!business.whatsappAccessTokenEncrypted) {
      throw new Error("El negocio no tiene un access token de WhatsApp conectado.");
    }

    try {
      const accessToken = decryptCredential(business.whatsappAccessTokenEncrypted);
      await sendWhatsAppText(business.whatsappPhoneNumberId, input.from, reply, accessToken);
      if (business.whatsappConnectionStatus !== "connected" || business.whatsappLastError) {
        await db.business.update({
          where: { id: business.id },
          data: { whatsappConnectionStatus: "connected", whatsappLastError: null },
        });
      }
    } catch (error) {
      await db.business.update({
        where: { id: business.id },
        data: {
          whatsappConnectionStatus: "error",
          whatsappLastError: error instanceof Error ? error.message.slice(0, 500) : "Error enviando a Meta.",
        },
      });
      throw error;
    }
  }

  return {
    duplicate: false,
    reply,
    requiresHuman,
    customerId: customer.id,
    conversationId: conversation.id,
  };
}
