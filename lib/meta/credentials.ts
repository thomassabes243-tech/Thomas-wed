import crypto from "node:crypto";

const PREFIX = "v1";

function keyMaterial() {
  const secret = process.env.WHATSAPP_CREDENTIALS_KEY?.trim();
  if (!secret) {
    throw new Error("WHATSAPP_CREDENTIALS_KEY no está configurada.");
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

export function encryptCredential(value: string) {
  const clean = value.trim();
  if (!clean) throw new Error("Credencial vacía.");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(clean, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptCredential(payload: string) {
  const [version, ivText, tagText, encryptedText] = payload.split(":");
  if (version !== PREFIX || !ivText || !tagText || !encryptedText) {
    throw new Error("Formato de credencial inválido.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyMaterial(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function whatsappCredentialEncryptionReady() {
  return Boolean(process.env.WHATSAPP_CREDENTIALS_KEY?.trim());
}
