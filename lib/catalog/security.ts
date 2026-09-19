import { db } from "@/lib/db";
import { hasCatalogAdminSession } from "./admin-session";

export async function assertCatalogAdmin() {
  if (!(await hasCatalogAdminSession())) {
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
