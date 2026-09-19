import { db } from "@/lib/db";
import { normalizeCatalogSearch } from "./normalize";

const STOP_WORDS = new Set([
  "a","al","algo","con","de","del","el","en","es","hay","la","las","lo","los",
  "me","para","por","que","quiero","si","tienen","tiene","un","una","unos","unas",
  "hoy","manana","mañana","fecha","disponible","disponibilidad","reservar","reserva",
  "cuanto","cuánto","cuesta","costo","precio","incluye","incluido","incluidos","hora","horario",
  "cual","cuál","cuales","cuáles","dame","informacion","información","sobre","necesito","busco",
  "personas","persona",
]);

const TOKEN_EQUIVALENTS: Record<string, string> = {
  habitaciones: "habitacion",
  cuarto: "habitacion",
  cuartos: "habitacion",
  rooms: "habitacion",
  tours: "tour",
  excursiones: "excursion",
  cabinas: "cabina",
  huespedes: "huesped",
  huéspedes: "huesped",
};

function normalizeToken(token: string) {
  return TOKEN_EQUIVALENTS[token] ?? token;
}

function queryTokens(value: string) {
  const normalized = normalizeCatalogSearch(value);
  if (!normalized) return [];
  return normalized
    .split(" ")
    .filter((token) => (token.length >= 2 || /^\\d+$/.test(token)) && !STOP_WORDS.has(token))
    .slice(0, 8);
}

export async function searchProducts(params: {
  businessId: string;
  query: string;
  limit?: number;
}) {
  const tokens = queryTokens(params.query);
  if (!tokens.length) return [];

  const limit = Math.max(1, Math.min(params.limit ?? 8, 20));
  return db.product.findMany({
    where: {
      businessId: params.businessId,
      active: true,
      AND: tokens.map((token) => ({ searchText: { contains: token } })),
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
