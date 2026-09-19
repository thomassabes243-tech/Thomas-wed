import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "metabot_catalog_admin";
const BUSINESS_COOKIE = "metabot_catalog_business";
const PREVIEW_ADMIN_PASSWORD_HASH =
  "7d397137f7b00cf31d399da469b35663f1edc978ddb9fa51f39975960516bc77";

function sessionSecret() {
  const explicit = process.env.CATALOG_ADMIN_SECRET?.trim();
  if (explicit) return explicit;

  if (process.env.VERCEL_ENV === "preview") {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      throw new Error("DATABASE_URL no está configurado para Preview.");
    }

    return createHash("sha256")
      .update(`metabot-catalog-preview-session:${databaseUrl}`)
      .digest("hex");
  }

  throw new Error("CATALOG_ADMIN_SECRET no está configurado.");
}

function digest(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function adminToken() {
  return digest("metabot-catalog-admin-v1");
}

export async function hasCatalogAdminSession() {
  const jar = await cookies();
  const supplied = jar.get(ADMIN_COOKIE)?.value;
  return Boolean(supplied && safeEqual(supplied, adminToken()));
}

export async function createCatalogAdminSession() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function createCatalogBusinessScope(businessId: string) {
  const jar = await cookies();
  const signature = digest(`metabot-catalog-business-v1:${businessId}`);
  jar.set(BUSINESS_COOKIE, `${businessId}.${signature}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function hasCatalogBusinessScope(businessId: string) {
  const jar = await cookies();
  const value = jar.get(BUSINESS_COOKIE)?.value ?? "";
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return false;

  const scopedBusinessId = value.slice(0, separator);
  const suppliedSignature = value.slice(separator + 1);
  if (scopedBusinessId !== businessId) return false;

  const expectedSignature = digest(`metabot-catalog-business-v1:${businessId}`);
  return safeEqual(suppliedSignature, expectedSignature);
}

export async function clearCatalogAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  jar.delete(BUSINESS_COOKIE);
}

export function verifyCatalogAdminPassword(value: string) {
  const explicit = process.env.CATALOG_ADMIN_SECRET?.trim();
  if (explicit) return safeEqual(value, explicit);

  if (process.env.VERCEL_ENV === "preview") {
    const suppliedHash = createHash("sha256").update(value).digest("hex");
    return safeEqual(suppliedHash, PREVIEW_ADMIN_PASSWORD_HASH);
  }

  return false;
}
