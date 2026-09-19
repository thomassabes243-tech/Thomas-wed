-- MetaBot CR catalog importer: multi-tenant, country-aware, currency-neutral catalog.
-- Review DATABASE_URL before applying. This migration must run only against MetaBot CR's Neon database.

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "country" TEXT;

DO $$ BEGIN
  CREATE TYPE "CatalogImportStatus" AS ENUM ('uploaded','processing','review_required','approved','importing','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CatalogImportMode" AS ENUM ('update','replace');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CatalogChangeAction" AS ENUM ('created','updated','unchanged','rejected','deactivated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CatalogImport" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "status" "CatalogImportStatus" NOT NULL DEFAULT 'uploaded',
  "mode" "CatalogImportMode" NOT NULL DEFAULT 'update',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "updatedRows" INTEGER NOT NULL DEFAULT 0,
  "unchangedRows" INTEGER NOT NULL DEFAULT 0,
  "rejectedRows" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "errorSummary" TEXT,
  "fileHash" TEXT,
  "mapping" JSONB,
  "preview" JSONB,
  "createdById" TEXT,
  CONSTRAINT "CatalogImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "externalCode" TEXT,
  "sku" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT,
  "price" DECIMAL(14,2),
  "stock" DECIMAL(14,3),
  "presentation" TEXT,
  "unit" TEXT,
  "requiresPrescription" BOOLEAN,
  "serviceType" TEXT,
  "location" TEXT,
  "duration" TEXT,
  "capacity" INTEGER,
  "checkInTime" TEXT,
  "checkOutTime" TEXT,
  "includes" TEXT,
  "amenities" TEXT,
  "availabilityNote" TEXT,
  "reservationRequired" BOOLEAN,
  "cancellationPolicy" TEXT,
  "searchText" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sourceImportId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CatalogImportChange" (
  "id" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "productId" TEXT,
  "rowNumber" INTEGER,
  "action" "CatalogChangeAction" NOT NULL,
  "identifier" TEXT,
  "beforeData" JSONB,
  "afterData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogImportChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CatalogImportReject" (
  "id" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "rowNumber" INTEGER,
  "reason" TEXT NOT NULL,
  "rowData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogImportReject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Product_businessId_sku_key" ON "Product"("businessId","sku");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_businessId_externalCode_key" ON "Product"("businessId","externalCode");
CREATE INDEX IF NOT EXISTS "Product_businessId_active_idx" ON "Product"("businessId","active");
CREATE INDEX IF NOT EXISTS "Product_businessId_name_idx" ON "Product"("businessId","name");
CREATE INDEX IF NOT EXISTS "Product_businessId_category_idx" ON "Product"("businessId","category");
CREATE INDEX IF NOT EXISTS "Product_businessId_searchText_idx" ON "Product"("businessId","searchText");
CREATE INDEX IF NOT EXISTS "CatalogImport_businessId_createdAt_idx" ON "CatalogImport"("businessId","createdAt");
CREATE INDEX IF NOT EXISTS "CatalogImport_businessId_status_idx" ON "CatalogImport"("businessId","status");
CREATE INDEX IF NOT EXISTS "CatalogImportChange_importId_action_idx" ON "CatalogImportChange"("importId","action");
CREATE INDEX IF NOT EXISTS "CatalogImportChange_productId_idx" ON "CatalogImportChange"("productId");
CREATE INDEX IF NOT EXISTS "CatalogImportReject_importId_idx" ON "CatalogImportReject"("importId");

DO $$ BEGIN
  ALTER TABLE "Product"
    ADD CONSTRAINT "Product_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Product"
    ADD CONSTRAINT "Product_sourceImportId_fkey"
    FOREIGN KEY ("sourceImportId") REFERENCES "CatalogImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CatalogImport"
    ADD CONSTRAINT "CatalogImport_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CatalogImport"
    ADD CONSTRAINT "CatalogImport_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CatalogImportChange"
    ADD CONSTRAINT "CatalogImportChange_importId_fkey"
    FOREIGN KEY ("importId") REFERENCES "CatalogImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CatalogImportChange"
    ADD CONSTRAINT "CatalogImportChange_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CatalogImportReject"
    ADD CONSTRAINT "CatalogImportReject_importId_fkey"
    FOREIGN KEY ("importId") REFERENCES "CatalogImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
