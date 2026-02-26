-- Add campaigns column to FeatureAssignment table
ALTER TABLE "FeatureAssignment" ADD COLUMN IF NOT EXISTS "campaigns" TEXT;

-- Check current assignments
SELECT * FROM "FeatureAssignment";
