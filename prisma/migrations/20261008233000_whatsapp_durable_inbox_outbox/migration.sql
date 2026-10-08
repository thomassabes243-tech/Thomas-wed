-- Additive migration: keep legacy WebhookEvent rows, no destructive changes.
-- Apply on a disposable test database first. Production remains blocked.
ALTER TABLE "WebhookEvent" ADD COLUMN "fromNumber" TEXT;
ALTER TABLE "WebhookEvent" ADD COLUMN "customerName" TEXT;
ALTER TABLE "WebhookEvent" ADD COLUMN "bodyText" TEXT;
ALTER TABLE "WebhookEvent" ADD COLUMN "replyText" TEXT;
ALTER TABLE "WebhookEvent" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "WebhookEvent" ADD COLUMN "requiresHuman" BOOLEAN;
ALTER TABLE "WebhookEvent" ADD COLUMN "deliveryState" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "WebhookEvent" ADD COLUMN "outboundMessageId" TEXT;
ALTER TABLE "WebhookEvent" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WebhookEvent" ADD COLUMN "claimExpiresAt" TIMESTAMP(3);
ALTER TABLE "WebhookEvent" ADD COLUMN "lastError" TEXT;
CREATE INDEX "WebhookEvent_status_claimExpiresAt_idx" ON "WebhookEvent"("status","claimExpiresAt");
CREATE INDEX "WebhookEvent_businessId_status_idx" ON "WebhookEvent"("businessId","status");
