import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { detectCatalogFileType, parseCatalogBuffer } from "@/lib/catalog/parser";
import { normalizeProductRow } from "@/lib/catalog/importer";
import { assertBusinessExists, assertCatalogAdmin } from "@/lib/catalog/security";

export const runtime = "nodejs";

function maxBytes() {
  const configured = Number(process.env.CATALOG_MAX_FILE_MB ?? "10");
  const mb = Number.isFinite(configured) && configured > 0 ? configured : 10;
  return mb * 1024 * 1024;
}

export async function POST(request: NextRequest) {
  try {
    await assertCatalogAdmin();
    const form = await request.formData();
    const businessId = String(form.get("businessId") ?? "").trim();
    const file = form.get("file");

    if (!businessId) return NextResponse.json({ error: "businessId requerido" }, { status: 400 });
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }
    if (file.size <= 0) return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
    if (file.size > maxBytes()) {
      return NextResponse.json(
        { error: "El archivo supera el límite configurado para esta instalación." },
        { status: 413 },
      );
    }

    const business = await assertBusinessExists(businessId);
    const fileType = detectCatalogFileType(file.name, file.type);
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = createHash("sha256").update(buffer).digest("hex");
    const parsed = parseCatalogBuffer(buffer, fileType);

    const identifiers = new Set<string>();
    const duplicateRows: number[] = [];
    const skuColumn = parsed.suggestedMapping.sku;
    const codeColumn = parsed.suggestedMapping.externalCode;

    parsed.rows.forEach((row, index) => {
      const value = String((skuColumn && row[skuColumn]) || (codeColumn && row[codeColumn]) || "").trim();
      if (!value) return;
      if (identifiers.has(value)) duplicateRows.push(index + 2);
      identifiers.add(value);
    });

    const validationErrors: Array<{ row: number; reason: string }> = [];
    if (!parsed.suggestedMapping.name) {
      validationErrors.push({ row: 1, reason: "No se detectó automáticamente una columna para Nombre." });
    }
    if (!parsed.suggestedMapping.sku && !parsed.suggestedMapping.externalCode) {
      validationErrors.push({ row: 1, reason: "No se detectó SKU ni código externo para controlar duplicados." });
    }

    parsed.rows.slice(0, 100).forEach((row, index) => {
      if (!parsed.suggestedMapping.name) return;
      try {
        const normalized = normalizeProductRow(row, parsed.suggestedMapping);
        if (!normalized.sku && !normalized.externalCode) {
          validationErrors.push({ row: index + 2, reason: "Falta SKU o código externo." });
        }
      } catch (error) {
        validationErrors.push({
          row: index + 2,
          reason: error instanceof Error ? error.message : "Fila inválida.",
        });
      }
    });

    const sampleSkus = parsed.rows
      .map((row) => skuColumn ? String(row[skuColumn] ?? "").trim() : "")
      .filter(Boolean)
      .slice(0, 1000);
    const sampleCodes = parsed.rows
      .map((row) => codeColumn ? String(row[codeColumn] ?? "").trim() : "")
      .filter(Boolean)
      .slice(0, 1000);

    const existingMatches =
      sampleSkus.length || sampleCodes.length
        ? await db.product.findMany({
            where: {
              businessId,
              OR: [
                ...(sampleSkus.length ? [{ sku: { in: sampleSkus } }] : []),
                ...(sampleCodes.length ? [{ externalCode: { in: sampleCodes } }] : []),
              ],
            },
            select: { id: true, name: true, sku: true, externalCode: true },
            take: 25,
          })
        : [];

    const previewPayload = {
      headers: parsed.headers,
      rows: parsed.previewRows,
      warnings: parsed.warnings,
      duplicateRows: duplicateRows.slice(0, 25),
      validationErrors: validationErrors.slice(0, 25),
      existingMatches,
    };

    const catalogImport = await db.catalogImport.create({
      data: {
        businessId,
        filename: file.name,
        fileType,
        fileHash,
        status: "review_required",
        totalRows: parsed.totalRows,
        mapping: parsed.suggestedMapping as Prisma.InputJsonObject,
        preview: previewPayload as Prisma.InputJsonObject,
      },
    });

    return NextResponse.json({
      importId: catalogImport.id,
      business,
      filename: file.name,
      fileType,
      fileHash,
      totalRows: parsed.totalRows,
      headers: parsed.headers,
      suggestedMapping: parsed.suggestedMapping,
      previewRows: parsed.previewRows,
      warnings: parsed.warnings,
      duplicateRows: duplicateRows.slice(0, 25),
      validationErrors: validationErrors.slice(0, 25),
      existingMatches,
      requiresApproval: true,
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo analizar el catálogo." },
      { status },
    );
  }
}
