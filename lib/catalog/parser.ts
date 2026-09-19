import * as XLSX from "xlsx";
import { suggestMapping } from "./mapping";

export type ParsedCatalogFile = {
  headers: string[];
  rows: Record<string, unknown>[];
  previewRows: Record<string, unknown>[];
  totalRows: number;
  suggestedMapping: ReturnType<typeof suggestMapping>;
  warnings: string[];
};

const MAX_PREVIEW_ROWS = 12;

function sanitizeCell(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.replace(/\u0000/g, "").trim();
}

export function parseCatalogBuffer(buffer: Buffer, fileType: "csv" | "xlsx"): ParsedCatalogFile {
  const workbook =
    fileType === "csv"
      ? XLSX.read(buffer.toString("utf8"), {
          type: "string",
          cellDates: false,
          cellFormula: false,
          cellHTML: false,
          raw: true,
          dense: false,
        })
      : XLSX.read(buffer, {
          type: "buffer",
          cellDates: false,
    cellFormula: false,
    cellHTML: false,
    raw: true,
          cellFormula: false,
          cellHTML: false,
          raw: true,
          dense: false,
        });

  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("El archivo no contiene hojas o datos.");

  const sheet = workbook.Sheets[firstSheet];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  if (!matrix.length) throw new Error("El archivo está vacío.");

  const rawHeaders = (matrix[0] ?? []).map((value, index) => {
    const text = String(value ?? "").trim();
    return text || `columna_${index + 1}`;
  });

  const duplicateCounts = new Map<string, number>();
  const headers = rawHeaders.map((header) => {
    const count = duplicateCounts.get(header) ?? 0;
    duplicateCounts.set(header, count + 1);
    return count === 0 ? header : `${header}__${count + 1}`;
  });

  const warnings: string[] = [];
  if (new Set(rawHeaders).size !== rawHeaders.length) {
    warnings.push("Se detectaron encabezados repetidos; fueron diferenciados para revisión.");
  }

  const rows = matrix
    .slice(1)
    .map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, sanitizeCell(values?.[index] ?? null)])),
    )
    .filter((row) => Object.values(row).some((value) => value !== null && value !== ""));

  if (!rows.length) throw new Error("El archivo no contiene registros para importar.");

  return {
    headers,
    rows,
    previewRows: rows.slice(0, MAX_PREVIEW_ROWS),
    totalRows: rows.length,
    suggestedMapping: suggestMapping(headers),
    warnings,
  };
}

export function detectCatalogFileType(filename: string, mimeType?: string | null): "csv" | "xlsx" {
  const lower = filename.toLowerCase();
  const mime = (mimeType ?? "").toLowerCase().trim();

  if (lower.endsWith(".csv")) {
    const allowed = new Set(["", "text/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream"]);
    if (!allowed.has(mime)) throw new Error("El tipo MIME no coincide con un archivo CSV permitido.");
    return "csv";
  }

  if (lower.endsWith(".xlsx")) {
    const allowed = new Set([
      "",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
      "application/zip",
    ]);
    if (!allowed.has(mime)) throw new Error("El tipo MIME no coincide con un archivo XLSX permitido.");
    return "xlsx";
  }

  throw new Error("Formato no permitido. Use únicamente archivos .csv o .xlsx.");
}
