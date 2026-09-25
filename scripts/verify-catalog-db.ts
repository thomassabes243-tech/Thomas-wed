import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurado.");

  const parsed = new URL(url);
  console.log(`Database host: ${parsed.hostname}`);

  const tables = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('Business', 'Product', 'CatalogImport', 'CatalogImportChange', 'CatalogImportReject')
  `;

  const names = new Set(tables.map((row) => row.table_name));
  for (const required of ["Business", "Product", "CatalogImport", "CatalogImportChange", "CatalogImportReject"]) {
    assert.equal(names.has(required), true, `Falta la tabla ${required}`);
  }

  const columns = await db.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product'
  `;

  const columnNames = new Set(columns.map((row) => row.column_name));
  for (const required of [
    "businessId","externalCode","sku","name","price","stock","serviceType","location",
    "duration","capacity","checkInTime","checkOutTime","includes","amenities",
    "availabilityNote","reservationRequired","cancellationPolicy","searchText","active"
  ]) {
    assert.equal(columnNames.has(required), true, `Falta Product.${required}`);
  }

  console.log("Catalog database verification passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
