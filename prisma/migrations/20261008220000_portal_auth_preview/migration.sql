-- Additive schema only; DO NOT execute against production without explicit approval.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

CREATE TABLE "PortalSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "PortalSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PortalSession_tokenHash_key" ON "PortalSession"("tokenHash");
CREATE INDEX "PortalSession_userId_expiresAt_idx" ON "PortalSession"("userId", "expiresAt");
ALTER TABLE "PortalSession" ADD CONSTRAINT "PortalSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PortalInvite" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "BusinessRole" NOT NULL DEFAULT 'agent',
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortalInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PortalInvite_tokenHash_key" ON "PortalInvite"("tokenHash");
CREATE INDEX "PortalInvite_businessId_email_idx" ON "PortalInvite"("businessId", "email");
CREATE INDEX "PortalInvite_businessId_createdAt_idx" ON "PortalInvite"("businessId", "createdAt");
ALTER TABLE "PortalInvite" ADD CONSTRAINT "PortalInvite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PortalLoginAttempt" (
  "emailHash" TEXT NOT NULL,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PortalLoginAttempt_pkey" PRIMARY KEY ("emailHash")
);
