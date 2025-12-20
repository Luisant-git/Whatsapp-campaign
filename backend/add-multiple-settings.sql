-- Migration to add support for multiple WhatsApp settings configurations

-- Add new columns to WhatsAppSettings table
ALTER TABLE "WhatsAppSettings" 
ADD COLUMN "name" TEXT,
ADD COLUMN "isDefault" BOOLEAN DEFAULT false;

-- Update existing records to have a name and set first one as default
UPDATE "WhatsAppSettings" 
SET "name" = 'Default Configuration'
WHERE "name" IS NULL;

-- Set the first record for each user as default
WITH first_settings AS (
  SELECT DISTINCT ON ("userId") id, "userId"
  FROM "WhatsAppSettings"
  ORDER BY "userId", "createdAt" ASC
)
UPDATE "WhatsAppSettings" 
SET "isDefault" = true
WHERE id IN (SELECT id FROM first_settings);

-- Make name column NOT NULL after updating existing records
ALTER TABLE "WhatsAppSettings" 
ALTER COLUMN "name" SET NOT NULL;

-- Add unique constraint for userId and name combination
ALTER TABLE "WhatsAppSettings" 
ADD CONSTRAINT "WhatsAppSettings_userId_name_key" UNIQUE ("userId", "name");