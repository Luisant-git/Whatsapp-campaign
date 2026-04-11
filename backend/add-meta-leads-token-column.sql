-- Add metaLeadsAccessToken column to MasterConfig table in all tenant databases

ALTER TABLE "MasterConfig" 
ADD COLUMN IF NOT EXISTS "metaLeadsAccessToken" TEXT;

COMMENT ON COLUMN "MasterConfig"."metaLeadsAccessToken" IS 'Separate access token for Meta Leads API with leads_retrieval permission';
