-- Additive migration. Apply only after reviewing the selected database.
CREATE TABLE "SalesLead" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "company" TEXT NOT NULL,
  "sector" TEXT NOT NULL,
  "interest" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "source" TEXT NOT NULL DEFAULT 'website',
  "submissionKey" TEXT NOT NULL,
  "consentedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesLead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SalesLead_submissionKey_key" ON "SalesLead"("submissionKey");
CREATE INDEX "SalesLead_createdAt_idx" ON "SalesLead"("createdAt");
CREATE INDEX "SalesLead_email_createdAt_idx" ON "SalesLead"("email","createdAt");
CREATE INDEX "SalesLead_status_createdAt_idx" ON "SalesLead"("status","createdAt");
