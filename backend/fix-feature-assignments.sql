-- Fix feature assignments table
ALTER TABLE "FeatureAssignment" DROP CONSTRAINT IF EXISTS "FeatureAssignment_userId_key";
ALTER TABLE "FeatureAssignment" DROP COLUMN IF EXISTS "userId";
