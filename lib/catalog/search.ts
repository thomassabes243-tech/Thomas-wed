import { db } from "@/lib/db";
import { normalizeCatalogSearch } from "./normalize";

const STOP_WORDS = new Set([
  "a","al","algo","con","de","del","el","en","es","hay","la","las","lo","los",
  "me","para","por","que","quiero","si","tienen","tiene","tenes","tienes","un","una","unos","unas",
  "hoy","manana","fecha","disponible","disponibilidad","reservar","reserva",
  "cuanto","cuesta","costo","precio","incluye","incluido","incluidos","hora","horario",
  "cual","cuales","dame","informacion","sobre","necesito","busco","personas","persona",
  "politica","requiere",

  // Conversación natural / cortesía. No deben afectar la búsqueda del catálogo.
  "hola","holas","buenas","buenos","buen","dia","dias","noche","noches","tarde","tardes",
  "saludos","disculpe","disculpa","perdon","perdone","favor","porfa","porfavor",
  "usted","ustedes","uds","vos","senor","senora",
  "vende","venden","maneja","manejan","trabajan","trabaja",
  "quisiera","queria","queria","gustaria","saber","consultar","consulta",
  "puede","pueden","podria","podrian","tendra","tendran",
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
};

function normalizeToken(token: string) {
  return TOKEN_EQUIVALENTS[token] ?? token;
}

export function catalogSearchTokens(value: string) {
  const normalized = normalizeCatalogSearch(value);
  if (!normalized) return [];

  return normalized
    .split(" ")
    .map(normalizeToken)
    .filter((token) => (token.length >= 2 || /^\d+$/.test(token)) && !STOP_WORDS.has(token))
    .slice(0, 8);
}

export async function searchProducts(params: {
  businessId: string;
  query: string;
  limit?: number;
}) {
  const tokens = catalogSearchTokens(params.query);
  if (!tokens.length) return [];

  const limit = Math.max(1, Math.min(params.limit ?? 8, 20));
  const select = {
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
    searchText: true,
  } as const;

  // Primero intentamos una coincidencia estricta con todos los términos útiles.
  const exact = await db.product.findMany({
    where: {
      businessId: params.businessId,
      active: true,
      AND: tokens.map((token) => ({ searchText: { contains: token } })),
    },
    select,
    take: limit,
    orderBy: [{ name: "asc" }],
  });

  if (exact.length) {
    return exact.map(({ searchText: _searchText, ...product }) => product);
  }

  // Si la frase natural trae palabras extra, usamos una búsqueda más tolerante
  // y ordenamos por cantidad de términos coincidentes.
  if (tokens.length === 1) return [];

  const candidates = await db.product.findMany({
    where: {
      businessId: params.businessId,
      active: true,
      OR: tokens.map((token) => ({ searchText: { contains: token } })),
    },
    select,
    take: Math.max(limit * 5, 25),
  });

  const ranked = candidates
    .map((product) => {
      const matched = tokens.filter((token) => product.searchText.includes(token)).length;
      const coverage = matched / tokens.length;
      return { product, matched, coverage };
    })
    .filter(({ matched, coverage }) => matched >= 1 && (tokens.length <= 2 || coverage >= 0.5))
    .sort((a, b) => b.matched - a.matched || b.coverage - a.coverage || a.product.name.localeCompare(b.product.name))
    .slice(0, limit);

  return ranked.map(({ product }) => {
    const { searchText: _searchText, ...rest } = product;
    return rest;
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
