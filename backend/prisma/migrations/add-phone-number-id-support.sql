-- Migration: Add phone_number_id support for multiple WhatsApp numbers

-- Add phoneNumberId to WhatsAppMessage table
ALTER TABLE "WhatsAppMessage" ADD COLUMN IF NOT EXISTS "phoneNumberId" TEXT;

-- Add phoneNumberId to Contact table
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "phoneNumberId" TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_phoneNumberId_idx" ON "WhatsAppMessage"("phoneNumberId");
CREATE INDEX IF NOT EXISTS "Contact_phone_phoneNumberId_idx" ON "Contact"("phone", "phoneNumberId");

-- Update existing records with default phoneNumberId from WhatsAppSettings
DO $$
DECLARE
    default_phone_number_id TEXT;
BEGIN
    -- Get the default phoneNumberId from WhatsAppSettings
    SELECT "phoneNumberId" INTO default_phone_number_id
    FROM "WhatsAppSettings"
    WHERE "isDefault" = true
    LIMIT 1;

    -- If no default found, get the first one
    IF default_phone_number_id IS NULL THEN
        SELECT "phoneNumberId" INTO default_phone_number_id
        FROM "WhatsAppSettings"
        LIMIT 1;
    END IF;

    -- Update existing WhatsAppMessage records
    IF default_phone_number_id IS NOT NULL THEN
        UPDATE "WhatsAppMessage"
        SET "phoneNumberId" = default_phone_number_id
        WHERE "phoneNumberId" IS NULL;

        UPDATE "Contact"
        SET "phoneNumberId" = default_phone_number_id
        WHERE "phoneNumberId" IS NULL;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN "WhatsAppMessage"."phoneNumberId" IS 'WhatsApp Business Phone Number ID that sent/received this message';
COMMENT ON COLUMN "Contact"."phoneNumberId" IS 'WhatsApp Business Phone Number ID associated with this contact conversation';
