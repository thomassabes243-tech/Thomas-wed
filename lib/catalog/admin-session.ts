import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "metabot_catalog_admin";

function secret() {
  const value = process.env.CATALOG_ADMIN_SECRET;
  if (!value) throw new Error("CATALOG_ADMIN_SECRET no está configurado.");
  return value;
}

function token() {
  return createHmac("sha256", secret()).update("metabot-catalog-admin-v1").digest("hex");
}

export async function hasCatalogAdminSession() {
  const jar = await cookies();
  const supplied = jar.get(COOKIE_NAME)?.value;
  if (!supplied) return false;

  const expected = token();
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createCatalogAdminSession() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearCatalogAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export function verifyCatalogAdminPassword(value: string) {
  const expected = Buffer.from(secret());
  const supplied = Buffer.from(value);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
