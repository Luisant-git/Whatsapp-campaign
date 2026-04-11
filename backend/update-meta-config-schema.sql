-- Update MetaConfig table structure

-- Add name column
ALTER TABLE "MetaConfig" 
ADD COLUMN IF NOT EXISTS "name" TEXT;

-- Make verifyToken nullable
ALTER TABLE "MetaConfig" 
ALTER COLUMN "verifyToken" DROP NOT NULL;

-- Drop unique constraint on pageId if it exists
ALTER TABLE "MetaConfig" 
DROP CONSTRAINT IF EXISTS "MetaConfig_pageId_key";

-- Update existing records to have a name
UPDATE "MetaConfig" 
SET "name" = 'Meta Leads Config ' || id::text 
WHERE "name" IS NULL;

-- Make name NOT NULL after setting values
ALTER TABLE "MetaConfig" 
ALTER COLUMN "name" SET NOT NULL;

-- Add unique constraint on name
ALTER TABLE "MetaConfig" 
ADD CONSTRAINT "MetaConfig_name_key" UNIQUE ("name");
