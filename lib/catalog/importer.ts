import { CatalogChangeAction, CatalogImportMode, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ColumnMapping } from "./mapping";
import { buildProductSearchText } from "./normalize";

export type CatalogSourceRow = Record<string, unknown>;

type NormalizedProduct = {
  externalCode: string | null;
  sku: string | null;
  name: string;
  category: string | null;
  description: string | null;
  price: Prisma.Decimal | null;
  stock: Prisma.Decimal | null;
  presentation: string | null;
  unit: string | null;
  requiresPrescription: boolean | null;
  searchText: string;
};

export type ImportSummary = {
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  rejected: number;
  deactivated: number;
};

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const clean = String(value).replace(/\u0000/g, "").trim();
  return clean || null;
}

function decimal(value: unknown): Prisma.Decimal | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return new Prisma.Decimal(value);

  let raw = String(value).trim().replace(/\s/g, "");
  raw = raw.replace(/[^0-9,.-]/g, "");
  if (!raw) return null;

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  if (lastComma > lastDot) raw = raw.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma) raw = raw.replace(/,/g, "");
  else raw = raw.replace(",", ".");

  if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new Error("valor numérico inválido");
  return new Prisma.Decimal(raw);
}

function booleanValue(value: unknown): boolean | null {
  const normalized = text(value)?.toLowerCase();
  if (!normalized) return null;
  if (["si", "sí", "yes", "true", "1", "requiere"].includes(normalized)) return true;
  if (["no", "false", "0", "no requiere"].includes(normalized)) return false;
  return null;
}

function get(row: CatalogSourceRow, mapping: ColumnMapping, field: keyof ColumnMapping) {
  const source = mapping[field];
  return source ? row[source] : null;
}

export function normalizeProductRow(row: CatalogSourceRow, mapping: ColumnMapping): NormalizedProduct {
  const name = text(get(row, mapping, "name"));
  if (!name) throw new Error("nombre de producto/servicio requerido");

  const priceRaw = get(row, mapping, "price");
  const stockRaw = get(row, mapping, "stock");

  const externalCode = text(get(row, mapping, "externalCode"));
  const sku = text(get(row, mapping, "sku"));
  const category = text(get(row, mapping, "category"));
  const description = text(get(row, mapping, "description"));
  const presentation = text(get(row, mapping, "presentation"));
  const unit = text(get(row, mapping, "unit"));

  return {
    externalCode,
    sku,
    name,
    category,
    description,
    price: priceRaw === null || priceRaw === "" ? null : decimal(priceRaw),
    stock: stockRaw === null || stockRaw === "" ? null : decimal(stockRaw),
    presentation,
    unit,
    requiresPrescription: booleanValue(get(row, mapping, "requiresPrescription")),
    searchText: buildProductSearchText([name, externalCode, sku, category, presentation]),
  };
}

function comparable(value: unknown) {
  if (value instanceof Prisma.Decimal) return value.toString();
  return value ?? null;
}

function hasChanged(
  existing: {
    externalCode: string | null;
    sku: string | null;
    name: string;
    category: string | null;
    description: string | null;
    price: Prisma.Decimal | null;
    stock: Prisma.Decimal | null;
    presentation: string | null;
    unit: string | null;
    requiresPrescription: boolean | null;
    searchText: string;
    active: boolean;
  },
  incoming: NormalizedProduct,
) {
  return (
    existing.externalCode !== incoming.externalCode ||
    existing.sku !== incoming.sku ||
    existing.name !== incoming.name ||
    existing.category !== incoming.category ||
    existing.description !== incoming.description ||
    comparable(existing.price) !== comparable(incoming.price) ||
    comparable(existing.stock) !== comparable(incoming.stock) ||
    existing.presentation !== incoming.presentation ||
    existing.unit !== incoming.unit ||
    existing.requiresPrescription !== incoming.requiresPrescription ||
    existing.searchText !== incoming.searchText ||
    existing.active !== true
  );
}

function toJsonProduct(product: NormalizedProduct): Prisma.InputJsonObject {
  return {
    externalCode: product.externalCode,
    sku: product.sku,
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price?.toString() ?? null,
    stock: product.stock?.toString() ?? null,
    presentation: product.presentation,
    unit: product.unit,
    requiresPrescription: product.requiresPrescription,
    searchText: product.searchText,
  };
}

export async function importCatalogRows(params: {
  importId: string;
  businessId: string;
  rows: CatalogSourceRow[];
  mapping: ColumnMapping;
  mode: CatalogImportMode;
  batchSize?: number;
}): Promise<ImportSummary> {
  const batchSize = Math.max(50, Math.min(params.batchSize ?? 500, 1000));
  const summary: ImportSummary = {
    processed: params.rows.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    rejected: 0,
    deactivated: 0,
  };

  await db.catalogImport.update({
    where: { id: params.importId },
    data: {
      status: "importing",
      mode: params.mode,
      totalRows: params.rows.length,
      mapping: params.mapping as Prisma.InputJsonObject,
      errorSummary: null,
    },
  });

  for (let offset = 0; offset < params.rows.length; offset += batchSize) {
    const chunk = params.rows.slice(offset, offset + batchSize);

    for (let i = 0; i < chunk.length; i++) {
      const row = chunk[i];
      const rowNumber = offset + i + 2;

      try {
        const product = normalizeProductRow(row, params.mapping);
        if (!product.sku && !product.externalCode) {
          throw new Error("se requiere SKU o código externo para evitar duplicados");
        }

        const existing = await db.product.findFirst({
          where: {
            businessId: params.businessId,
            OR: [
              ...(product.sku ? [{ sku: product.sku }] : []),
              ...(product.externalCode ? [{ externalCode: product.externalCode }] : []),
            ],
          },
        });

        if (!existing) {
          const created = await db.product.create({
            data: {
              businessId: params.businessId,
              ...product,
              active: true,
              sourceImportId: params.importId,
            },
          });
          summary.created++;
          await db.catalogImportChange.create({
            data: {
              importId: params.importId,
              productId: created.id,
              rowNumber,
              action: CatalogChangeAction.created,
              identifier: product.sku ?? product.externalCode,
              afterData: toJsonProduct(product),
            },
          });
          continue;
        }

        const changed = hasChanged(existing, product);
        const beforeData: Prisma.InputJsonObject = {
          externalCode: existing.externalCode,
          sku: existing.sku,
          name: existing.name,
          category: existing.category,
          description: existing.description,
          price: existing.price?.toString() ?? null,
          stock: existing.stock?.toString() ?? null,
          presentation: existing.presentation,
          unit: existing.unit,
          requiresPrescription: existing.requiresPrescription,
          searchText: existing.searchText,
          active: existing.active,
        };

        const updated = await db.product.update({
          where: { id: existing.id },
          data: { ...product, active: true, sourceImportId: params.importId },
        });

        if (changed) summary.updated++;
        else summary.unchanged++;

        await db.catalogImportChange.create({
          data: {
            importId: params.importId,
            productId: updated.id,
            rowNumber,
            action: changed ? CatalogChangeAction.updated : CatalogChangeAction.unchanged,
            identifier: product.sku ?? product.externalCode,
            beforeData,
            afterData: toJsonProduct(product),
          },
        });
      } catch (error) {
        summary.rejected++;
        const reason = error instanceof Error ? error.message : "fila inválida";
        await db.catalogImportReject.create({
          data: {
            importId: params.importId,
            rowNumber,
            reason,
            rowData: row as Prisma.InputJsonObject,
          },
        });
      }
    }
  }

  if (params.mode === CatalogImportMode.replace) {
    const toDeactivate = await db.product.findMany({
      where: {
        businessId: params.businessId,
        active: true,
        OR: [{ sourceImportId: null }, { sourceImportId: { not: params.importId } }],
      },
      select: { id: true, name: true, sku: true, externalCode: true },
    });

    if (toDeactivate.length) {
      await db.product.updateMany({
        where: { id: { in: toDeactivate.map((item) => item.id) }, businessId: params.businessId },
        data: { active: false },
      });
      summary.deactivated = toDeactivate.length;

      await db.catalogImportChange.createMany({
        data: toDeactivate.map((item) => ({
          importId: params.importId,
          productId: item.id,
          action: CatalogChangeAction.deactivated,
          identifier: item.sku ?? item.externalCode ?? item.name,
        })),
      });
    }
  }

  await db.catalogImport.update({
    where: { id: params.importId },
    data: {
      status: "completed",
      importedRows: summary.created,
      updatedRows: summary.updated,
      unchangedRows: summary.unchanged,
      rejectedRows: summary.rejected,
      completedAt: new Date(),
    },
  });

  return summary;
}
