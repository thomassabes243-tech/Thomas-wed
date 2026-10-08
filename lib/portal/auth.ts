import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { operatorPreviewAllowed, verifyAdminPassword } from "@/lib/catalog/auth-core";
import {
  PORTAL_COOKIE,
  PORTAL_SESSION_SECONDS,
  isPortalToken,
  portalRoleAllows,
  portalToken,
  portalTokenHash,
  type PortalPermission,
} from "./auth-core";

function fail(status: number, message: string): never {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  throw error;
}

export function requirePortalPreview() {
  if (!operatorPreviewAllowed()) fail(404, "Portal de clientes deshabilitado hasta aprobar la producción.");
}

export async function currentPortalUser() {
  if (!operatorPreviewAllowed()) return null;
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!isPortalToken(token)) return null;
  const item = await db.portalSession.findUnique({
    where: { tokenHash: portalTokenHash(token) },
    include: { user: { select: { id: true, name: true, email: true, passwordHash: true } } },
  });
  if (!item || item.revokedAt || item.expiresAt <= new Date() || !item.user.passwordHash) return null;
  return { id: item.user.id, email: item.user.email, name: item.user.name, sessionId: item.id };
}

export async function requirePortalUser() {
  requirePortalPreview();
  const user = await currentPortalUser();
  if (!user) fail(401, "Iniciá sesión para acceder al portal.");
  return user;
}

export async function requirePortalBusiness(businessId: string, permission: PortalPermission = "read") {
  const user = await requirePortalUser();
  if (!businessId || businessId.length > 200) fail(400, "Identificador de negocio inválido.");
  const membership = await db.businessUser.findUnique({
    where: { userId_businessId: { userId: user.id, businessId } },
    include: { business: { select: { id: true, name: true, status: true, country: true } } },
  });
  if (!membership || membership.business.status !== "active" || !portalRoleAllows(membership.role, permission)) {
    fail(403, "No tenés autorización para acceder a este negocio.");
  }
  return { user, membership };
}

export async function setPortalSession(userId: string) {
  requirePortalPreview();
  const token = portalToken();
  await db.portalSession.create({
    data: {
      userId,
      tokenHash: portalTokenHash(token),
      expiresAt: new Date(Date.now() + PORTAL_SESSION_SECONDS * 1000),
    },
  });
  (await cookies()).set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: PORTAL_SESSION_SECONDS,
  });
}

export async function clearPortalSession() {
  const jar = await cookies();
  const token = jar.get(PORTAL_COOKIE)?.value;
  if (isPortalToken(token)) {
    await db.portalSession.updateMany({
      where: { tokenHash: portalTokenHash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(PORTAL_COOKIE);
}
