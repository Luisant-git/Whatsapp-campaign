-- Add campaigns field to FeatureAssignment table
ALTER TABLE "FeatureAssignment" ADD COLUMN IF NOT EXISTS "campaigns" TEXT;
