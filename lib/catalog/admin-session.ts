import { cookies } from "next/headers";
import {
  issueBusinessScope,
  issueOperatorSession,
  operatorCredentialsConfigured,
  OPERATOR_SESSION_TTL_MS,
  readOperatorSession,
  verifyAdminPassword,
  verifyBusinessScope,
} from "./auth-core";

const ADMIN_COOKIE = "metabot_catalog_admin";
const BUSINESS_COOKIE = "metabot_catalog_business";

// An intentionally Preview-only platform operator. A real client login with
// BusinessUser role checks is mandatory before enabling customer production.
export function isCatalogOperatorConfigured(): boolean {
  return operatorCredentialsConfigured();
}

async function currentOperatorSession() {
  if (!isCatalogOperatorConfigured()) return null;
  const jar = await cookies();
  return readOperatorSession(
    jar.get(ADMIN_COOKIE)?.value,
    process.env.CATALOG_SESSION_SECRET,
  );
}

export async function hasCatalogAdminSession() {
  return Boolean(await currentOperatorSession());
}

export async function createCatalogAdminSession() {
  if (!isCatalogOperatorConfigured()) {
    throw new Error("Acceso de operador no configurado para Preview.");
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, issueOperatorSession(process.env.CATALOG_SESSION_SECRET!), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OPERATOR_SESSION_TTL_MS / 1000,
  });
  // Selecting a business in an old session does not confer access in a new one.
  jar.delete(BUSINESS_COOKIE);
}

export async function createCatalogBusinessScope(businessId: string) {
  const session = await currentOperatorSession();
  if (!session) throw new Error("Sesión administrativa inválida o vencida.");
  const jar = await cookies();
  jar.set(
    BUSINESS_COOKIE,
    issueBusinessScope(businessId, session, process.env.CATALOG_SESSION_SECRET!),
    {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
    },
  );
}

export async function hasCatalogBusinessScope(businessId: string) {
  const session = await currentOperatorSession();
  const jar = await cookies();
  return verifyBusinessScope(
    jar.get(BUSINESS_COOKIE)?.value,
    businessId,
    session,
    process.env.CATALOG_SESSION_SECRET,
  );
}

export async function clearCatalogAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  jar.delete(BUSINESS_COOKIE);
}

export function verifyCatalogAdminPassword(value: string) {
  if (!isCatalogOperatorConfigured()) return false;
  return verifyAdminPassword(value, process.env.CATALOG_ADMIN_PASSWORD_SCRYPT);
}
