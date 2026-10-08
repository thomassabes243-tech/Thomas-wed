-- Add assignment identity for agents; preserves existing conversations.
-- This migration has not been executed against production.
ALTER TABLE "Conversation" ADD COLUMN "assignedBusinessUserId" TEXT;
CREATE INDEX "Conversation_businessId_assignedBusinessUserId_idx" ON "Conversation"("businessId","assignedBusinessUserId");
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedBusinessUserId_fkey"
  FOREIGN KEY ("assignedBusinessUserId") REFERENCES "BusinessUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
