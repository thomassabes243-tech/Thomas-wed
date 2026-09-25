-- Add per-business WhatsApp connection state.
-- Additive and safe for the existing Preview database where these columns may already exist.

ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "whatsappAccessTokenEncrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappConnectionStatus" TEXT NOT NULL DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS "whatsappLastError" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappConnectedAt" TIMESTAMP(3);
