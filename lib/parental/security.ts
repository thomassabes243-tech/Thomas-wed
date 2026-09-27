import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getParentalDb } from "./db";

const DEFAULT_ADMIN_EMAIL = "tg321920@gmail.com";
const DEFAULT_ADMIN_KEY_HASH = "b3c59c845c6f30dc9809676424f98346b80f5531944231b25a02682b7f76157a";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

export function randomId() {
  return randomBytes(18).toString("base64url");
}

export function randomPairingCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function safeHexEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export function adminEmail() {
  return process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
}

export function isAdminRequest(request: NextRequest) {
  const key = request.headers.get("x-admin-key") || "";
  const email = (request.headers.get("x-admin-email") || "").trim().toLowerCase();
  const configuredEmail = adminEmail().trim().toLowerCase();
  const configuredHash = process.env.PARENTAL_ADMIN_KEY_HASH || DEFAULT_ADMIN_KEY_HASH;
  return email === configuredEmail && safeHexEqual(sha256(key), configuredHash);
}

export async function authenticateDevice(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const tokenHash = sha256(auth.slice(7).trim());
  const db = getParentalDb();
  const rows = await db.$queryRaw<Array<{
    id: string;
    email: string;
    name: string;
    paired: boolean;
  }>>`
    SELECT id, email, name, paired
    FROM parental_devices
    WHERE token_hash = ${tokenHash}
    LIMIT 1
  `;
  return rows[0] || null;
}

export function redactSensitive(value: string | null | undefined) {
  if (!value) return null;
  const text = value.slice(0, 600);
  const sensitiveWords = /(otp|2fa|verification code|security code|código de verificación|código de seguridad|contraseña|password|pin bancario|tarjeta|bank|banco)/i;
  const likelyCode = /(^|\D)\d{4,8}(\D|$)/;
  if (sensitiveWords.test(text) || likelyCode.test(text)) {
    return "[contenido sensible oculto]";
  }
  return text;
}
