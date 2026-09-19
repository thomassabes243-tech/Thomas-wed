import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export function assertCatalogAdmin(request: NextRequest) {
  const expected = process.env.CATALOG_ADMIN_SECRET;
  if (!expected) throw new Error("CATALOG_ADMIN_SECRET no está configurado.");
  const supplied = request.headers.get("x-metabot-admin-secret");
  if (!supplied || supplied !== expected) {
    const error = new Error("No autorizado.");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
}

export async function assertBusinessExists(businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, country: true },
  });
  if (!business) {
    const error = new Error("Empresa no encontrada.");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  return business;
}
