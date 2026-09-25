import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertCatalogBusinessAccess } from "@/lib/catalog/security";
import {
  assertWhatsAppPreviewOnly,
  getMetaEmbeddedSignupConfig,
  getPreviewWebhookUrl,
  getWhatsAppVerifyToken,
} from "@/lib/meta/config";
import {
  decryptCredential,
  encryptCredential,
  whatsappCredentialEncryptionReady,
} from "@/lib/meta/credentials";
import {
  exchangeEmbeddedSignupCode,
  getWhatsAppBusinessAccount,
  getWhatsAppPhoneNumber,
  subscribeAppToWaba,
} from "@/lib/meta/client";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function connectionPayload(request: NextRequest, businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      whatsappPhoneNumberId: true,
      whatsappBusinessAccountId: true,
      whatsappAccessTokenEncrypted: true,
      whatsappConnectionStatus: true,
      whatsappLastError: true,
      whatsappConnectedAt: true,
    },
  });
  if (!business) throw new Error("Empresa no encontrada.");

  const [eventCount, lastEvent] = await Promise.all([
    db.webhookEvent.count({ where: { businessId } }),
    db.webhookEvent.findFirst({
      where: { businessId },
      orderBy: { receivedAt: "desc" },
      select: { status: true, receivedAt: true, processedAt: true },
    }),
  ]);

  const meta = getMetaEmbeddedSignupConfig();
  const verifyToken = getWhatsAppVerifyToken();
  const encryptionReady = whatsappCredentialEncryptionReady();
  const callbackUrl = getPreviewWebhookUrl(request.nextUrl.origin);

  return {
    previewOnly: true,
    business: {
      id: business.id,
      name: business.name,
      phoneNumber: business.phoneNumber,
    },
    connection: {
      status: business.whatsappConnectionStatus,
      phoneNumberId: business.whatsappPhoneNumberId,
      businessAccountId: business.whatsappBusinessAccountId,
      tokenStored: Boolean(business.whatsappAccessTokenEncrypted),
      connectedAt: business.whatsappConnectedAt,
      lastError: business.whatsappLastError,
      webhookEvents: eventCount,
      lastWebhookAt: lastEvent?.receivedAt ?? null,
      lastWebhookStatus: lastEvent?.status ?? null,
    },
    meta: {
      appId: meta.appId,
      configId: meta.configId,
      appSecretReady: meta.appSecretReady,
      encryptionReady,
      embeddedSignupReady: Boolean(meta.appId && meta.configId && meta.appSecretReady && encryptionReady),
    },
    webhook: {
      callbackUrl,
      verifyToken,
      verifyTokenReady: Boolean(verifyToken),
      protectionBypassConfigured: Boolean(
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ||
        process.env.WHATSAPP_WEBHOOK_PUBLIC_URL?.trim(),
      ),
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    assertWhatsAppPreviewOnly();
    const businessId = request.nextUrl.searchParams.get("businessId")?.trim() ?? "";
    if (!businessId) return NextResponse.json({ error: "businessId requerido." }, { status: 400 });
    await assertCatalogBusinessAccess(businessId);
    return NextResponse.json(await connectionPayload(request, businessId));
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar WhatsApp." },
      { status },
    );
  }
}

export async function POST(request: NextRequest) {
  let businessId = "";
  try {
    assertWhatsAppPreviewOnly();
    const body = (await request.json()) as {
      action?: string;
      businessId?: string;
      phoneNumber?: string;
      code?: string;
      phoneNumberId?: string;
      businessAccountId?: string;
    };

    businessId = clean(body.businessId);
    if (!businessId) return NextResponse.json({ error: "businessId requerido." }, { status: 400 });
    await assertCatalogBusinessAccess(businessId);

    const action = clean(body.action);

    if (action === "save-phone") {
      await db.business.update({
        where: { id: businessId },
        data: { phoneNumber: clean(body.phoneNumber) || null },
      });
      return NextResponse.json(await connectionPayload(request, businessId));
    }

    if (action === "disconnect") {
      await db.business.update({
        where: { id: businessId },
        data: {
          whatsappPhoneNumberId: null,
          whatsappBusinessAccountId: null,
          whatsappAccessTokenEncrypted: null,
          whatsappConnectionStatus: "disconnected",
          whatsappLastError: null,
          whatsappConnectedAt: null,
        },
      });
      return NextResponse.json(await connectionPayload(request, businessId));
    }

    if (action === "complete-signup") {
      const code = clean(body.code);
      const phoneNumberId = clean(body.phoneNumberId);
      const businessAccountId = clean(body.businessAccountId);

      if (!code || !phoneNumberId || !businessAccountId) {
        return NextResponse.json(
          { error: "Meta no devolvió código, Phone Number ID o WABA ID completos." },
          { status: 400 },
        );
      }
      if (!whatsappCredentialEncryptionReady()) {
        return NextResponse.json(
          { error: "Falta WHATSAPP_CREDENTIALS_KEY en el entorno Preview." },
          { status: 503 },
        );
      }

      const exchanged = await exchangeEmbeddedSignupCode(code);
      const accessToken = exchanged.access_token;
      if (!accessToken) throw new Error("Meta no devolvió access token.");

      const [phoneInfo, wabaInfo] = await Promise.all([
        getWhatsAppPhoneNumber(accessToken, phoneNumberId),
        getWhatsAppBusinessAccount(accessToken, businessAccountId),
      ]);

      await subscribeAppToWaba(accessToken, businessAccountId);

      const displayPhone =
        typeof phoneInfo.display_phone_number === "string"
          ? phoneInfo.display_phone_number
          : undefined;

      await db.business.update({
        where: { id: businessId },
        data: {
          phoneNumber: displayPhone || clean(body.phoneNumber) || undefined,
          whatsappPhoneNumberId: phoneNumberId,
          whatsappBusinessAccountId: businessAccountId,
          whatsappAccessTokenEncrypted: encryptCredential(accessToken),
          whatsappConnectionStatus: "connected",
          whatsappLastError: null,
          whatsappConnectedAt: new Date(),
        },
      });

      return NextResponse.json({
        ...(await connectionPayload(request, businessId)),
        verified: {
          phone: phoneInfo,
          businessAccount: wabaInfo,
        },
      });
    }

    if (action === "validate") {
      const business = await db.business.findUnique({
        where: { id: businessId },
        select: {
          whatsappPhoneNumberId: true,
          whatsappBusinessAccountId: true,
          whatsappAccessTokenEncrypted: true,
        },
      });
      if (
        !business?.whatsappPhoneNumberId ||
        !business.whatsappBusinessAccountId ||
        !business.whatsappAccessTokenEncrypted
      ) {
        return NextResponse.json({ error: "La conexión todavía está incompleta." }, { status: 400 });
      }

      const token = decryptCredential(business.whatsappAccessTokenEncrypted);
      await Promise.all([
        getWhatsAppPhoneNumber(token, business.whatsappPhoneNumberId),
        getWhatsAppBusinessAccount(token, business.whatsappBusinessAccountId),
        subscribeAppToWaba(token, business.whatsappBusinessAccountId),
      ]);

      await db.business.update({
        where: { id: businessId },
        data: { whatsappConnectionStatus: "connected", whatsappLastError: null },
      });

      return NextResponse.json(await connectionPayload(request, businessId));
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Error desconocido de WhatsApp.";
    if (businessId) {
      await db.business
        .update({
          where: { id: businessId },
          data: {
            whatsappConnectionStatus: "error",
            whatsappLastError: detail.slice(0, 500),
          },
        })
        .catch(() => undefined);
    }
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json({ error: detail }, { status });
  }
}
