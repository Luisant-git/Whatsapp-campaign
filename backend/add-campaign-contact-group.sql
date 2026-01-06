-- Add group column to CampaignContact table
ALTER TABLE "CampaignContact" 
ADD COLUMN IF NOT EXISTS "group" TEXT;
