import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidMetaSignature } from "@/lib/meta/signature";
import { handleWhatsAppInbound } from "@/lib/bot/whatsapp-delivery";
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
  if (raw.length > 1_000_000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  if (!isValidMetaSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let event: MetaPayload;
  try {
    event = JSON.parse(raw) as MetaPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const results: Array<{ messageId?: string; status: string }> = [];
  let shouldRetry = false;
  let seen = 0;
  for (const entry of event.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;
      const business = await db.business.findUnique({
        where: { whatsappPhoneNumberId: phoneNumberId },
        select: { id: true, status: true },
      });
      if (!business || business.status !== "active") {
        results.push({ status: "ignored" });
        continue;
      }
      for (const message of value?.messages ?? []) {
        seen++;
        if (seen > 100) {
          return NextResponse.json({ error: "Webhook batch exceeds limit." }, { status: 413 });
        }
        const id = message.id;
        const from = message.from ?? "";
        const body = message.type === "text" ? message.text?.body?.trim() ?? "" : "";
        if (!id || !from || !body) {
          results.push({ messageId: id, status: "ignored" });
          continue;
        }
        try {
          const state = await handleWhatsAppInbound({
            messageId: id,
            businessId: business.id,
            from,
            text: body,
            customerName: value?.contacts?.find(c => c.wa_id === from)?.profile?.name ?? null,
          });
          results.push({ messageId: id, status: state });
          if (state === "retryable") shouldRetry = true;
        } catch {
          // A transient DB outage should prompt Meta to retry the signed event.
          results.push({ messageId: id, status: "retryable" });
          shouldRetry = true;
        }
      }
    }
  }

  return NextResponse.json(
    { received: !shouldRetry, results },
    { status: shouldRetry ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
