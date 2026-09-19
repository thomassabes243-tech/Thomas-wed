import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { detectCatalogFileType, parseCatalogBuffer } from "@/lib/catalog/parser";
import { assertBusinessExists, assertCatalogAdmin } from "@/lib/catalog/security";

export const runtime = "nodejs";

function maxBytes() {
  const configured = Number(process.env.CATALOG_MAX_FILE_MB ?? "10");
  const mb = Number.isFinite(configured) && configured > 0 ? configured : 10;
  return mb * 1024 * 1024;
}

export async function POST(request: NextRequest) {
  try {
    assertCatalogAdmin(request);
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
    const parsed = parseCatalogBuffer(Buffer.from(await file.arrayBuffer()), fileType);

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

    const previewPayload = {
      headers: parsed.headers,
      rows: parsed.previewRows,
      warnings: parsed.warnings,
      duplicateRows: duplicateRows.slice(0, 25),
    };

    const catalogImport = await db.catalogImport.create({
      data: {
        businessId,
        filename: file.name,
        fileType,
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
      totalRows: parsed.totalRows,
      headers: parsed.headers,
      suggestedMapping: parsed.suggestedMapping,
      previewRows: parsed.previewRows,
      warnings: parsed.warnings,
      duplicateRows: duplicateRows.slice(0, 25),
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
