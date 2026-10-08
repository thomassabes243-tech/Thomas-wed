import {
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

// Temporary operator-only authentication for Preview and local development.
// This is NOT the per-user/tenant authorization required for production.
export const OPERATOR_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PASSWORD_HASH_PATTERN = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/i;

export type OperatorSession = {
  version: 1;
  id: string;
  issuedAt: number;
  expiresAt: number;
};

export function operatorPreviewAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === "preview" ||
    (!env.VERCEL_ENV && env.NODE_ENV === "development");
}

export function operatorCredentialsConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return operatorPreviewAllowed(env) &&
    Boolean(env.CATALOG_SESSION_SECRET && env.CATALOG_SESSION_SECRET.length >= 32) &&
    Boolean(env.CATALOG_ADMIN_PASSWORD_SCRYPT && PASSWORD_HASH_PATTERN.test(env.CATALOG_ADMIN_PASSWORD_SCRYPT));
}

export function createAdminPasswordHash(password: string, salt: Buffer = randomBytes(16)): string {
  if (!password || salt.length !== 16) throw new Error("Se requiere una contraseña y salt seguro.");
  const digest = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return "scrypt$" + salt.toString("hex") + "$" + digest.toString("hex");
}

export function verifyAdminPassword(password: string, encoded: string | undefined): boolean {
  if (!password || !encoded) return false;
  const parts = PASSWORD_HASH_PATTERN.exec(encoded);
  if (!parts) return false;
  const expected = Buffer.from(parts[2], "hex");
  const actual = scryptSync(password, Buffer.from(parts[1], "hex"), expected.length, {
    N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(actual, expected);
}

function isUsableSecret(secret: string | undefined): secret is string {
  return typeof secret === "string" && secret.length >= 32;
}

function signed(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function equalSignatures(a: string, b: string): boolean {
  if (a.length !== b.length || a.length > 100) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function issueOperatorSession(secret: string, now: number = Date.now()): string {
  if (!isUsableSecret(secret)) throw new Error("CATALOG_SESSION_SECRET inválido.");
  const data: OperatorSession = {
    version: 1,
    id: randomUUID(),
    issuedAt: now,
    expiresAt: now + OPERATOR_SESSION_TTL_MS,
  };
  const value = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  return value + "." + signed(value, secret);
}

export function readOperatorSession(
  cookie: string | undefined,
  secret: string | undefined,
  now: number = Date.now(),
): OperatorSession | null {
  if (!cookie || cookie.length > 1024 || !isUsableSecret(secret)) return null;
  const separator = cookie.lastIndexOf(".");
  if (separator <= 0) return null;
  const value = cookie.slice(0, separator);
  const signature = cookie.slice(separator + 1);
  if (!equalSignatures(signature, signed(value, secret))) return null;
  try {
    const data: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!data || typeof data !== "object") return null;
    const item = data as Partial<OperatorSession>;
    if (item.version !== 1 || typeof item.id !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(item.id) ||
        !Number.isSafeInteger(item.issuedAt) || !Number.isSafeInteger(item.expiresAt)) return null;
    if (item.issuedAt! > now || item.expiresAt! <= now ||
        item.expiresAt! - item.issuedAt! !== OPERATOR_SESSION_TTL_MS) return null;
    return item as OperatorSession;
  } catch {
    return null;
  }
}

export function issueBusinessScope(
  businessId: string,
  session: OperatorSession,
  secret: string,
): string {
  if (!isUsableSecret(secret) || !businessId || businessId.length > 200) {
    throw new Error("No se puede emitir el alcance empresarial.");
  }
  const signature = signed("business:" + session.id + ":" + businessId, secret);
  return businessId + "." + signature;
}

export function verifyBusinessScope(
  cookie: string | undefined,
  businessId: string,
  session: OperatorSession | null,
  secret: string | undefined,
): boolean {
  if (!cookie || cookie.length > 512 || !session || !isUsableSecret(secret) ||
      !businessId || businessId.length > 200) return false;
  const separator = cookie.lastIndexOf(".");
  if (separator <= 0 || cookie.slice(0, separator) !== businessId) return false;
  const signature = cookie.slice(separator + 1);
  return equalSignatures(signature, signed("business:" + session.id + ":" + businessId, secret));
}
