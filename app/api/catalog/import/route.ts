import { createHash } from "crypto";
import { CatalogImportMode, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { importCatalogRows } from "@/lib/catalog/importer";
import type { ColumnMapping } from "@/lib/catalog/mapping";
import { detectCatalogFileType, parseCatalogBuffer } from "@/lib/catalog/parser";
import { assertCatalogBusinessAccess } from "@/lib/catalog/security";

export const runtime = "nodejs";

function maxBytes() {
  const configured = Number(process.env.CATALOG_MAX_FILE_MB ?? "10");
  const mb = Number.isFinite(configured) && configured > 0 ? configured : 10;
  return mb * 1024 * 1024;
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const businessId = String(form.get("businessId") ?? "").trim();
    const importId = String(form.get("importId") ?? "").trim();
    const mappingRaw = String(form.get("mapping") ?? "{}");
    const modeRaw = String(form.get("mode") ?? "update");
    const approved = String(form.get("approved") ?? "") === "true";
    const file = form.get("file");

    if (!approved) {
      return NextResponse.json({ error: "La importación requiere aprobación explícita." }, { status: 400 });
    }
    if (!businessId || !importId) {
      return NextResponse.json({ error: "businessId e importId son requeridos." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debe volver a adjuntar el archivo aprobado." }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
    }
    if (file.size > maxBytes()) {
      return NextResponse.json({ error: "El archivo supera el límite configurado." }, { status: 413 });
    }

    await assertCatalogBusinessAccess(businessId);
    const existingImport = await db.catalogImport.findFirst({
      where: { id: importId, businessId },
    });
    if (!existingImport) {
      return NextResponse.json({ error: "Importación no encontrada para esta empresa." }, { status: 404 });
    }
    if (!["review_required", "approved", "failed"].includes(existingImport.status)) {
      return NextResponse.json({ error: "Esta importación no está disponible para aprobación." }, { status: 409 });
    }

    const mapping = JSON.parse(mappingRaw) as ColumnMapping;
    if (!mapping.name) {
      return NextResponse.json({ error: "Debe mapear una columna al campo name." }, { status: 400 });
    }
    if (!mapping.sku && !mapping.externalCode) {
      return NextResponse.json(
        { error: "Debe mapear SKU o código externo para controlar duplicados." },
        { status: 400 },
      );
    }

    const mode =
      modeRaw === "replace" ? CatalogImportMode.replace : CatalogImportMode.update;

    const fileType = detectCatalogFileType(file.name, file.type);
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = createHash("sha256").update(buffer).digest("hex");
    if (
      fileType !== existingImport.fileType ||
      file.name !== existingImport.filename ||
      (existingImport.fileHash && existingImport.fileHash !== fileHash)
    ) {
      return NextResponse.json(
        { error: "El archivo aprobado no coincide con el archivo analizado." },
        { status: 400 },
      );
    }

    const parsed = parseCatalogBuffer(buffer, fileType);

    await db.catalogImport.update({
      where: { id: importId },
      data: {
        status: "approved",
        mapping: mapping as Prisma.InputJsonObject,
      },
    });

    const summary = await importCatalogRows({
      importId,
      businessId,
      rows: parsed.rows,
      mapping,
      mode,
    });

    return NextResponse.json({ importId, mode, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar el catálogo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
