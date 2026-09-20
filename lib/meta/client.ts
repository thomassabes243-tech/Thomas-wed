import { getWhatsAppApiVersion } from "./config";

type MetaErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

async function readGraphResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as MetaErrorPayload & Record<string, unknown>;
  if (!response.ok) {
    const message = payload.error?.message || `Meta API respondió ${response.status}`;
    const error = new Error(message);
    (error as Error & { status?: number; metaCode?: number }).status = response.status;
    (error as Error & { status?: number; metaCode?: number }).metaCode = payload.error?.code;
    throw error;
  }
  return payload;
}

export async function exchangeEmbeddedSignupCode(code: string) {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID y META_APP_SECRET deben estar configurados en Preview.");
  }

  const version = getWhatsAppApiVersion();
  const url = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);

  const redirectUri = process.env.META_OAUTH_REDIRECT_URI?.trim();
  if (redirectUri) url.searchParams.set("redirect_uri", redirectUri);

  const response = await fetch(url, { method: "GET", cache: "no-store" });
  const payload = (await readGraphResponse(response)) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  };
  if (!payload.access_token) throw new Error("Meta no devolvió un access token.");
  return payload;
}

export async function getWhatsAppPhoneNumber(token: string, phoneNumberId: string) {
  const version = getWhatsAppApiVersion();
  const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}`);
  url.searchParams.set("fields", "id,display_phone_number,verified_name,quality_rating,platform_type");
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return readGraphResponse(response);
}

export async function getWhatsAppBusinessAccount(token: string, businessAccountId: string) {
  const version = getWhatsAppApiVersion();
  const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(businessAccountId)}`);
  url.searchParams.set("fields", "id,name");
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return readGraphResponse(response);
}

export async function subscribeAppToWaba(token: string, businessAccountId: string) {
  const version = getWhatsAppApiVersion();
  const response = await fetch(
    `https://graph.facebook.com/${version}/${encodeURIComponent(businessAccountId)}/subscribed_apps`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  return readGraphResponse(response);
}

export async function sendWhatsAppText(
  phoneNumberId: string,
  to: string,
  body: string,
  accessToken: string,
) {
  const version = getWhatsAppApiVersion();
  const response = await fetch(
    `https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body },
      }),
    },
  );
  return readGraphResponse(response);
}
