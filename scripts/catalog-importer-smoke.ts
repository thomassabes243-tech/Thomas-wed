import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseCatalogBuffer } from "../lib/catalog/parser";
import { normalizeCatalogSearch } from "../lib/catalog/normalize";
import { normalizeProductRow } from "../lib/catalog/importer";
import { catalogSearchTokens } from "../lib/catalog/search";

const sourceRows = Array.from({ length: 1500 }, (_, index) => ({
  "Código producto": `SKU-${String(index + 1).padStart(5, "0")}`,
  "Descripción": index === 0 ? "Acetaminofén 500 mg" : `Producto ${index + 1}`,
  "Precio Venta": index === 10 ? "abc" : 100 + index,
  "Existencia": index % 7,
  "Categoría": index % 2 ? "General" : "Farmacia",
}));

const worksheet = XLSX.utils.json_to_sheet(sourceRows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Catálogo");
const xlsx = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

const parsed = parseCatalogBuffer(Buffer.from(xlsx), "xlsx");
assert.equal(parsed.totalRows, 1500);
assert.equal(parsed.suggestedMapping.externalCode, "Código producto");
assert.equal(parsed.suggestedMapping.name, "Descripción");
assert.equal(parsed.suggestedMapping.price, "Precio Venta");
assert.equal(parsed.suggestedMapping.stock, "Existencia");
assert.equal(parsed.suggestedMapping.category, "Categoría");

const first = normalizeProductRow(parsed.rows[0], parsed.suggestedMapping);
assert.equal(first.name, "Acetaminofén 500 mg");
assert.equal(first.externalCode, "SKU-00001");
assert.equal(first.searchText.includes("acetaminofen 500 mg"), true);

assert.throws(
  () => normalizeProductRow(parsed.rows[10], parsed.suggestedMapping),
  /valor numérico inválido/,
);

assert.equal(normalizeCatalogSearch("ACETAMINOFÉN   500"), "acetaminofen 500");

const csv = Buffer.from(
  "Cod,Producto,Precio,Stock\nA1,Tornillo,125,10\nA2,Tuerca,90,\n",
  "utf8",
);
const parsedCsv = parseCatalogBuffer(csv, "csv");
assert.equal(parsedCsv.totalRows, 2);
assert.equal(parsedCsv.suggestedMapping.externalCode, "Cod");
assert.equal(parsedCsv.suggestedMapping.name, "Producto");
assert.equal(parsedCsv.suggestedMapping.price, "Precio");
assert.equal(parsedCsv.suggestedMapping.stock, "Stock");

const duplicateHeaderCsv = Buffer.from("Código,Código,Producto\n1,1,Prueba\n", "utf8");
const duplicateParsed = parseCatalogBuffer(duplicateHeaderCsv, "csv");
assert.equal(duplicateParsed.warnings.length > 0, true);

const tourismCsv = Buffer.from(
  [
    "Código,Servicio,Tipo de habitación,Ubicación,Capacidad,Check-in,Check-out,Incluye,Amenidades,Disponibilidad,Requiere reserva,Política de cancelación,Precio",
    "HAB-DBL,Habitación Doble,Habitación,Guanacaste,2,14:00,11:00,Desayuno,WiFi y aire acondicionado,Sujeto a confirmación,Sí,24 horas,75",
    "TOUR-01,Tour Volcán,Tour,Rincón de la Vieja,8,,,Transporte y guía,,Cupos sujetos a fecha,Sí,48 horas,55",
  ].join("\n"),
  "utf8",
);
const tourismParsed = parseCatalogBuffer(tourismCsv, "csv");
assert.equal(tourismParsed.suggestedMapping.externalCode, "Código");
assert.equal(tourismParsed.suggestedMapping.name, "Servicio");
assert.equal(tourismParsed.suggestedMapping.serviceType, "Tipo de habitación");
assert.equal(tourismParsed.suggestedMapping.location, "Ubicación");
assert.equal(tourismParsed.suggestedMapping.capacity, "Capacidad");
assert.equal(tourismParsed.suggestedMapping.checkInTime, "Check-in");
assert.equal(tourismParsed.suggestedMapping.checkOutTime, "Check-out");
assert.equal(tourismParsed.suggestedMapping.includes, "Incluye");
assert.equal(tourismParsed.suggestedMapping.amenities, "Amenidades");
assert.equal(tourismParsed.suggestedMapping.availabilityNote, "Disponibilidad");
assert.equal(tourismParsed.suggestedMapping.reservationRequired, "Requiere reserva");
assert.equal(tourismParsed.suggestedMapping.cancellationPolicy, "Política de cancelación");

const room = normalizeProductRow(tourismParsed.rows[0], tourismParsed.suggestedMapping);
assert.equal(room.name, "Habitación Doble");
assert.equal(room.serviceType, "Habitación");
assert.equal(room.location, "Guanacaste");
assert.equal(room.capacity, 2);
assert.equal(room.checkInTime, "14:00");
assert.equal(room.checkOutTime, "11:00");
assert.equal(room.reservationRequired, true);
assert.equal(room.searchText.includes("habitacion doble"), true);
assert.equal(room.searchText.includes("2 personas"), true);
assert.equal(room.searchText.includes("check in 14 00"), true);
assert.equal(room.searchText.includes("cancelacion 24 horas"), true);
assert.deepEqual(
  catalogSearchTokens("¿Cuánto cuesta la habitación doble para 2 personas mañana?"),
  ["habitacion", "doble", "2"],
);
assert.deepEqual(
  catalogSearchTokens("¿Qué tours tienen en Rincón de la Vieja?"),
  ["tour", "rincon", "vieja"],
);
assert.deepEqual(
  catalogSearchTokens("¿A qué hora es el check-in?"),
  ["check", "in"],
);

const ambiguousCapacityCsv = Buffer.from(
  "Código,Servicio,Capacidad\nA1,Habitación Familiar,2 adultos + 2 niños\n",
  "utf8",
);
const ambiguousCapacity = parseCatalogBuffer(ambiguousCapacityCsv, "csv");
assert.throws(
  () => normalizeProductRow(ambiguousCapacity.rows[0], ambiguousCapacity.suggestedMapping),
  /capacidad inválida/,
);

assert.throws(() => parseCatalogBuffer(Buffer.from(""), "csv"), /vacío|hojas|datos/i);

console.log("Catalog importer smoke test passed: XLSX 1500 rows + CSV + tourism/lodging + malformed values.");
