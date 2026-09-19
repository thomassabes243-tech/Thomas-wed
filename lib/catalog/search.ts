import { db } from "@/lib/db";
import { normalizeCatalogSearch } from "./normalize";

function normalizeQuery(value: string) {
  return normalizeCatalogSearch(value);
}

export async function searchProducts(params: {
  businessId: string;
  query: string;
  limit?: number;
}) {
  const query = normalizeQuery(params.query);
  if (!query) return [];

  const limit = Math.max(1, Math.min(params.limit ?? 8, 20));
  return db.product.findMany({
    where: {
      businessId: params.businessId,
      active: true,
      searchText: { contains: query },
    },
    select: {
      id: true,
      externalCode: true,
      sku: true,
      name: true,
      category: true,
      description: true,
      price: true,
      stock: true,
      presentation: true,
      unit: true,
      requiresPrescription: true,
      serviceType: true,
      location: true,
      duration: true,
      capacity: true,
      checkInTime: true,
      checkOutTime: true,
      includes: true,
      amenities: true,
      availabilityNote: true,
      reservationRequired: true,
      cancellationPolicy: true,
    },
    take: limit,
    orderBy: [{ name: "asc" }],
  });
}

export async function getProductByCode(params: { businessId: string; code: string }) {
  return db.product.findFirst({
    where: {
      businessId: params.businessId,
      active: true,
      OR: [{ sku: params.code }, { externalCode: params.code }],
    },
  });
}

export async function getProductsByCategory(params: {
  businessId: string;
  category: string;
  limit?: number;
}) {
  return db.product.findMany({
    where: {
      businessId: params.businessId,
      active: true,
      category: { contains: params.category, mode: "insensitive" },
    },
    take: Math.max(1, Math.min(params.limit ?? 10, 30)),
    orderBy: { name: "asc" },
  });
}

export async function checkProductStock(params: { businessId: string; productId: string }) {
  return db.product.findFirst({
    where: { id: params.productId, businessId: params.businessId, active: true },
    select: { id: true, name: true, stock: true, unit: true },
  });
}
