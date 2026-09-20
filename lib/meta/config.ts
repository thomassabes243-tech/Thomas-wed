import crypto from "node:crypto";

export function assertWhatsAppPreviewOnly() {
  if (process.env.VERCEL_ENV !== "preview") {
    const error = new Error("La conexión de WhatsApp está habilitada únicamente en Preview.");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
}

export function getWhatsAppVerifyToken() {
  const configured = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (configured) return configured;

  if (process.env.VERCEL_ENV === "preview") {
    const basis = process.env.DATABASE_URL || process.env.CATALOG_ADMIN_SECRET;
    if (basis) {
      return crypto
        .createHash("sha256")
        .update(`metabot-preview-whatsapp:${basis}`)
        .digest("hex")
        .slice(0, 32);
    }
  }

  return null;
}

export function getWhatsAppApiVersion() {
  return process.env.WHATSAPP_API_VERSION?.trim() || "v23.0";
}

export function getMetaEmbeddedSignupConfig() {
  return {
    appId: process.env.META_APP_ID?.trim() || null,
    configId: process.env.META_WHATSAPP_CONFIG_ID?.trim() || null,
    appSecretReady: Boolean(process.env.META_APP_SECRET?.trim()),
  };
}

export function getPreviewWebhookUrl(origin: string) {
  const explicit = process.env.WHATSAPP_WEBHOOK_PUBLIC_URL?.trim();
  const branchHost = process.env.VERCEL_BRANCH_URL?.trim();
  const base = explicit || (branchHost ? `https://${branchHost}/api/webhooks/whatsapp` : `${origin}/api/webhooks/whatsapp`);

  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (!bypass || explicit) return base;

  const url = new URL(base);
  url.searchParams.set("x-vercel-protection-bypass", bypass);
  return url.toString();
}
