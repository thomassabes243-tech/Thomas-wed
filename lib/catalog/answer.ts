import { db } from "@/lib/db";
import { searchProducts } from "./search";

export type CatalogAnswer = {
  reply: string;
  found: boolean;
  requiresHuman: boolean;
  productIds: string[];
};

function isClinicalQuestion(value: string) {
  return /\b(dosis|cuanto debo tomar|cuánto debo tomar|puedo tomar|embaraz|niñ[oa]|sustitu|reemplaz|tratamiento|diagn[oó]stic|mezclar|interacci[oó]n|contraindic|efecto secundario)\b/i.test(value);
}

function formatPrice(value: { toString(): string } | null) {
  return value ? value.toString() : null;
}

function formatStock(value: { toString(): string } | null, unit: string | null) {
  if (!value) return null;
  return unit ? `${value.toString()} ${unit}` : value.toString();
}

export async function answerCatalogQuestion(params: {
  businessId: string;
  query: string;
  limit?: number;
}): Promise<CatalogAnswer> {
  const business = await db.business.findUnique({
    where: { id: params.businessId },
    select: { id: true, type: true },
  });

  if (!business) {
    return {
      reply: "No tengo información confirmada de este negocio en este momento.",
      found: false,
      requiresHuman: true,
      productIds: [],
    };
  }

  const isPharmacy = /farmacia|pharmacy/i.test(business.type ?? "");
  if (isPharmacy && isClinicalQuestion(params.query)) {
    return {
      reply:
        "Esa consulta necesita criterio profesional. Puedo ayudarte a revisar el catálogo, pero para dosis, tratamientos, sustituciones o seguridad de un medicamento debe responder el farmacéutico o responsable del negocio.",
      found: false,
      requiresHuman: true,
      productIds: [],
    };
  }

  const products = await searchProducts({
    businessId: params.businessId,
    query: params.query,
    limit: params.limit ?? 5,
  });

  if (!products.length) {
    return {
      reply:
        "No encontré ese producto o servicio en el catálogo registrado. Puedo ayudarte a buscarlo con otro nombre o pasar la consulta al negocio.",
      found: false,
      requiresHuman: false,
      productIds: [],
    };
  }

  const visible = products.slice(0, 3);
  const lines = visible.map((product) => {
    const details: string[] = [];
    if (product.presentation) details.push(product.presentation);

    const price = formatPrice(product.price);
    if (price) details.push(`precio registrado: ${price}`);

    const stock = formatStock(product.stock, product.unit);
    if (stock) details.push(`inventario registrado: ${stock}`);

    if (product.requiresPrescription === true) details.push("requiere receta según el catálogo");

    return details.length ? `${product.name} — ${details.join(" · ")}` : product.name;
  });

  const prefix = visible.length === 1 ? "Sí. Encontré:" : "Encontré estas opciones:";
  return {
    reply: `${prefix}\n${lines.join("\n")}`,
    found: true,
    requiresHuman: false,
    productIds: visible.map((product) => product.id),
  };
}
