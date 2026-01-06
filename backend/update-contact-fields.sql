-- Remove lastCampaignName column and add group column to Contact table
ALTER TABLE "Contact" 
DROP COLUMN IF EXISTS "lastCampaignName",
ADD COLUMN IF NOT EXISTS "group" TEXT;
