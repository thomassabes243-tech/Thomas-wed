export function assertWhatsAppPreviewOnly() {
  const allowed =
    process.env.VERCEL_ENV === "preview" ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === "development");

  if (!allowed) {
    const error = new Error("La conexión de WhatsApp está habilitada únicamente en Preview o desarrollo.");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
}

export function getWhatsAppVerifyToken() {
  // A webhook verify token must be an explicit, independent secret. Never
  // derive it from DATABASE_URL, a shared admin password or another credential.
  return process.env.WHATSAPP_VERIFY_TOKEN?.trim() || null;
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
