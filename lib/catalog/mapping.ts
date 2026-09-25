export const CATALOG_FIELDS = [
  "externalCode",
  "sku",
  "name",
  "category",
  "description",
  "price",
  "stock",
  "presentation",
  "unit",
  "requiresPrescription",
  "serviceType",
  "location",
  "duration",
  "capacity",
  "checkInTime",
  "checkOutTime",
  "includes",
  "amenities",
  "availabilityNote",
  "reservationRequired",
  "cancellationPolicy",
] as const;

export type CatalogField = (typeof CATALOG_FIELDS)[number];
export type ColumnMapping = Partial<Record<CatalogField, string>>;

const aliases: Record<CatalogField, string[]> = {
  externalCode: ["codigo","codigo producto","cod","referencia","codigo articulo","id producto"],
  sku: ["sku","sku producto"],
  name: ["nombre","producto","descripcion","nombre articulo","articulo","servicio"],
  category: ["categoria","familia","grupo","tipo"],
  description: ["detalle","descripcion larga","observaciones"],
  price: ["precio","precio venta","valor","precio unitario"],
  stock: ["stock","existencia","inventario","cantidad"],
  presentation: ["presentacion","formato","empaque"],
  unit: ["unidad","unidad medida","medida","precio por","tarifa por","cobro por","unidad tarifa","rate unit","por noche","por persona"],
  requiresPrescription: ["requiere receta","receta","prescripcion","requiere prescripcion"],
  serviceType: ["tipo servicio","tipo de servicio","tipo habitacion","tipo de habitacion","habitacion","room type","tour type","actividad"],
  location: ["ubicacion","lugar","zona","destino","punto de encuentro","meeting point","location"],
  duration: ["duracion","duración","tiempo","duracion tour","duracion actividad","nights","noches"],
  capacity: ["capacidad","personas","huespedes","huéspedes","pasajeros","cupos","max personas","ocupacion maxima","ocupación máxima"],
  checkInTime: ["check in","check-in","hora entrada","hora de entrada","entrada"],
  checkOutTime: ["check out","check-out","hora salida","hora de salida","salida"],
  includes: ["incluye","incluido","incluidos","includes","servicios incluidos"],
  amenities: ["amenidades","comodidades","servicios habitacion","servicios habitación","facilidades","amenities"],
  availabilityNote: ["disponibilidad","nota disponibilidad","estado disponibilidad","availability","availability note"],
  reservationRequired: ["requiere reserva","reserva requerida","reservacion requerida","reservación requerida","booking required"],
  cancellationPolicy: ["politica cancelacion","política cancelación","politica de cancelacion","política de cancelación","cancellation policy"],
};

export function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((header) => ({ header, normalized: normalizeHeader(header) }));
  const mapping: ColumnMapping = {};

  for (const field of CATALOG_FIELDS) {
    const candidates = aliases[field].map(normalizeHeader);
    const exact = normalized.find(({ normalized: n }) => candidates.includes(n));
    if (exact) {
      mapping[field] = exact.header;
      continue;
    }

    const partial = normalized.find(({ normalized: n }) =>
      candidates.some((candidate) => n.includes(candidate) || candidate.includes(n)),
    );
    if (partial) mapping[field] = partial.header;
  }

  return mapping;
}
