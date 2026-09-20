import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidMetaSignature } from "@/lib/meta/signature";
import { processInboundMessage } from "@/lib/bot/process-inbound";
import { assertWhatsAppPreviewOnly, getWhatsAppVerifyToken } from "@/lib/meta/config";

type MetaMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
};

type MetaValue = {
  metadata?: { phone_number_id?: string };
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  messages?: MetaMessage[];
};

type MetaPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: MetaValue;
    }>;
  }>;
};

export async function GET(request: NextRequest) {
  try {
    assertWhatsAppPreviewOnly();
    const q = request.nextUrl.searchParams;
    const verifyToken = getWhatsAppVerifyToken();
    if (
      verifyToken &&
      q.get("hub.mode") === "subscribe" &&
      q.get("hub.verify_token") === verifyToken
    ) {
      return new NextResponse(q.get("hub.challenge") ?? "", { status: 200 });
    }
    return NextResponse.json({ error: "Verificación rechazada" }, { status: 403 });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook no disponible." }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    assertWhatsAppPreviewOnly();
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook no disponible." }, { status });
  }

  const raw = await request.text();
  if (!isValidMetaSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let event: MetaPayload;
  try {
    event = JSON.parse(raw) as MetaPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const results: Array<{ messageId?: string; status: string; detail?: string }> = [];

  for (const entry of event.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const business = await db.business.findUnique({
        where: { whatsappPhoneNumberId: phoneNumberId },
        select: { id: true },
      });

      if (!business) {
        results.push({ status: "ignored", detail: "Número de WhatsApp no asociado a un negocio." });
        continue;
      }

      const contact = value?.contacts?.[0];
      for (const message of value?.messages ?? []) {
        const messageId = message.id;
        const from = message.from ?? contact?.wa_id ?? "";
        const text = message.type === "text" ? message.text?.body?.trim() ?? "" : "";

        if (!messageId || !from || !text) {
          results.push({ messageId, status: "ignored", detail: "Mensaje no textual o incompleto." });
          continue;
        }

        const existingEvent = await db.webhookEvent.findUnique({
          where: { eventId: messageId },
        });
        if (existingEvent) {
          results.push({ messageId, status: "duplicate" });
          continue;
        }

        await db.webhookEvent.create({
          data: {
            eventId: messageId,
            businessId: business.id,
            status: "processing",
          },
        });

        try {
          const processed = await processInboundMessage({
            businessId: business.id,
            from,
            customerName: contact?.profile?.name ?? null,
            text,
            whatsappMessageId: messageId,
            sendToWhatsApp: true,
          });

          await db.webhookEvent.update({
            where: { eventId: messageId },
            data: { status: "processed", processedAt: new Date() },
          });
          results.push({ messageId, status: processed.duplicate ? "duplicate" : "processed" });
        } catch (error) {
          await db.webhookEvent.update({
            where: { eventId: messageId },
            data: { status: "failed", processedAt: new Date() },
          });
          results.push({
            messageId,
            status: "failed",
            detail: error instanceof Error ? error.message : "Error desconocido",
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true, results });
}
