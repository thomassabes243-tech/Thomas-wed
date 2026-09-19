import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "metabot_catalog_admin";
const BUSINESS_COOKIE = "metabot_catalog_business";

function secret() {
  const value = process.env.CATALOG_ADMIN_SECRET;
  if (!value) throw new Error("CATALOG_ADMIN_SECRET no está configurado.");
  return value;
}

function digest(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
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
  const expected = Buffer.from(secret());
  const supplied = Buffer.from(value);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
