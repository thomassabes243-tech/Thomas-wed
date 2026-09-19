import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseCatalogBuffer } from "../lib/catalog/parser";
import { normalizeCatalogSearch } from "../lib/catalog/normalize";
import { normalizeProductRow } from "../lib/catalog/importer";

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

assert.throws(() => parseCatalogBuffer(Buffer.from(""), "csv"), /vacío|hojas|datos/i);

console.log("Catalog importer smoke test passed: XLSX 1500 rows + CSV + malformed values.");
