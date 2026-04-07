-- Add BSUID support to WhatsAppMessage table
ALTER TABLE "WhatsAppMessage" ADD COLUMN IF NOT EXISTS "userId" VARCHAR(256);
ALTER TABLE "WhatsAppMessage" ADD COLUMN IF NOT EXISTS "parentUserId" VARCHAR(256);
ALTER TABLE "WhatsAppMessage" ADD COLUMN IF NOT EXISTS "username" VARCHAR(100);

-- Add BSUID support to Contact table
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "userId" VARCHAR(256);
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "parentUserId" VARCHAR(256);
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "username" VARCHAR(100);

-- Add indexes for BSUID lookups
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_userId_idx" ON "WhatsAppMessage"("userId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_parentUserId_idx" ON "WhatsAppMessage"("parentUserId");
CREATE INDEX IF NOT EXISTS "Contact_userId_idx" ON "Contact"("userId");
CREATE INDEX IF NOT EXISTS "Contact_parentUserId_idx" ON "Contact"("parentUserId");

-- Add unique constraint for userId + phoneNumberId combination
CREATE UNIQUE INDEX IF NOT EXISTS "Contact_userId_phoneNumberId_key" ON "Contact"("userId", "phoneNumberId") WHERE "userId" IS NOT NULL;
