import { NextRequest, NextResponse } from "next/server";
import { BusinessRole } from "@prisma/client";
import { db } from "@/lib/db";
import { hasCatalogAdminSession } from "@/lib/catalog/admin-session";
import { requirePortalBusiness, requirePortalPreview } from "@/lib/portal/auth";
import {
  canInvitePortalRole,
  normalizePortalEmail,
  PORTAL_INVITE_SECONDS,
  portalToken,
  portalTokenHash,
} from "@/lib/portal/auth-core";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    requirePortalPreview();
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") return errorResponse("Solicitud inválida.", 400);
    const input = payload as Record<string, unknown>;
    const businessId = typeof input.businessId === "string" ? input.businessId.trim() : "";
    const email = normalizePortalEmail(input.email);
    const requestedRole = typeof input.role === "string" ? input.role : "agent";
    if (!businessId || businessId.length > 200 || !email ||
        !Object.values(BusinessRole).includes(requestedRole as BusinessRole)) {
      return errorResponse("Negocio, correo o rol inválido.", 400);
    }
    const role = requestedRole as BusinessRole;
    const operator = await hasCatalogAdminSession();
    if (!operator) {
      const { membership } = await requirePortalBusiness(businessId, "invite");
      if (!canInvitePortalRole(membership.role, role)) return errorResponse("El rol solicitado no está autorizado.", 403);
    }
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: { status: true },
    });
    if (!business || business.status !== "active") return errorResponse("Negocio no disponible.", 404);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const issued = await db.portalInvite.count({
      where: { businessId, createdAt: { gte: hourAgo } },
    });
    if (issued >= 20) return errorResponse("Límite de invitaciones alcanzado; intentalo después.", 429);
    const token = portalToken();
    await db.portalInvite.create({
      data: {
        businessId, email, role,
        tokenHash: portalTokenHash(token),
        expiresAt: new Date(Date.now() + PORTAL_INVITE_SECONDS * 1000),
      },
    });
    const origin = request.nextUrl.origin;
    const inviteUrl = new URL("/portal/accept", origin);
    inviteUrl.searchParams.set("token", token);
    return NextResponse.json({
      inviteUrl: inviteUrl.toString(),
      expiresHours: PORTAL_INVITE_SECONDS / 3600,
      message: "Enlace de un solo uso. Compartilo únicamente con el destinatario autorizado.",
    }, { status: 201, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 400;
    return errorResponse(status >= 500 ? "No se pudo emitir la invitación." : (err instanceof Error ? err.message : "Error de invitación."), status);
  }
}
