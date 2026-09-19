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

function isHospitalityBusiness(value: string | null) {
  return /hotel|hostal|hospedaje|cabina|lodge|turismo|tour|excursion|excursión|operador turist/i.test(value ?? "");
}

function isHospitalityQuery(value: string) {
  return /\b(hotel|hostal|hosped|cabina|lodge|habitaci[oó]n|tour|excursi[oó]n|check.?in|check.?out|reserva|hu[eé]sped|pasajero)\b/i.test(value);
}

function isLocationQuestion(value: string) {
  return /\b(donde|dónde|ubicaci[oó]n|direccion|dirección|como llegar|cómo llegar)\b/i.test(value);
}

function asksForDateAvailability(value: string) {
  return /\b(disponib|reserv|habitaci[oó]n.*(?:hoy|mañana|manana|fecha)|hoy|mañana|manana|esta noche|fin de semana|check.?in|entrada.*fecha)\b/i.test(value);
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
    select: { id: true, name: true, type: true, address: true },
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

  const hospitality = isHospitalityBusiness(business.type) || isHospitalityQuery(params.query);
  const dateAvailability = hospitality && asksForDateAvailability(params.query);

  if (hospitality && isLocationQuestion(params.query) && business.address) {
    return {
      reply: `La ubicación registrada de ${business.name} es: ${business.address}.`,
      found: true,
      requiresHuman: false,
      productIds: [],
    };
  }

  const products = await searchProducts({
    businessId: params.businessId,
    query: params.query,
    limit: params.limit ?? 5,
  });

  if (!products.length) {
    if (hospitality && isLocationQuestion(params.query)) {
      return {
        reply:
          "No tengo una ubicación suficientemente confirmada en los datos registrados. Puedo pasar la consulta al negocio para que te comparta la dirección correcta.",
        found: false,
        requiresHuman: true,
        productIds: [],
      };
    }

    if (dateAvailability) {
      return {
        reply:
          "No puedo confirmar disponibilidad para una fecha concreta con la información registrada. Puedo ayudarte a pasar la consulta al negocio para confirmar habitación, cupo o reserva.",
        found: false,
        requiresHuman: true,
        productIds: [],
      };
    }

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
    const productHasTourismData = Boolean(
      product.serviceType ||
      product.location ||
      product.duration ||
      product.capacity !== null ||
      product.checkInTime ||
      product.checkOutTime ||
      product.includes ||
      product.amenities ||
      product.availabilityNote ||
      product.reservationRequired !== null ||
      product.cancellationPolicy,
    );

    if (product.serviceType) details.push(product.serviceType);
    if (product.presentation) details.push(product.presentation);
    if (product.location) details.push(`ubicación: ${product.location}`);
    if (product.duration) details.push(`duración: ${product.duration}`);
    if (product.capacity !== null) details.push(`capacidad registrada: ${product.capacity} personas`);
    if (product.checkInTime) details.push(`check-in: ${product.checkInTime}`);
    if (product.checkOutTime) details.push(`check-out: ${product.checkOutTime}`);
    if (product.includes) details.push(`incluye: ${product.includes}`);
    if (product.amenities) details.push(`comodidades: ${product.amenities}`);
    if (product.availabilityNote) details.push(`disponibilidad registrada: ${product.availabilityNote}`);
    if (product.reservationRequired === true) details.push("requiere reserva");
    if (product.cancellationPolicy) details.push(`cancelación: ${product.cancellationPolicy}`);

    const price = formatPrice(product.price);
    if (price) details.push(`precio registrado: ${price}`);

    if (!productHasTourismData) {
      const stock = formatStock(product.stock, product.unit);
      if (stock) details.push(`inventario registrado: ${stock}`);
    }

    if (product.requiresPrescription === true) details.push("requiere receta según el catálogo");

    return details.length ? `${product.name} — ${details.join(" · ")}` : product.name;
  });

  const prefix = visible.length === 1 ? "Encontré esta opción:" : "Encontré estas opciones:";
  const availabilityNotice = dateAvailability
    ? "\nLa disponibilidad para una fecha concreta debe confirmarla el negocio; este catálogo no funciona como inventario de habitaciones/cupos en tiempo real."
    : "";

  return {
    reply: `${prefix}\n${lines.join("\n")}${availabilityNotice}`,
    found: true,
    requiresHuman: dateAvailability,
    productIds: visible.map((product) => product.id),
  };
}
