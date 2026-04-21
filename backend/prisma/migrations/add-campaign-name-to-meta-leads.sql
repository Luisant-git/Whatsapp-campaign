-- Add campaignName column to MetaLead table
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "campaignName" TEXT;

-- Create index on campaignName for faster filtering
CREATE INDEX IF NOT EXISTS "MetaLead_campaignName_idx" ON "MetaLead"("campaignName");
