-- Fix corrupted buttons column in QuickReply table

-- Step 1: Drop the corrupted column completely
ALTER TABLE "QuickReply" DROP COLUMN IF EXISTS "buttons";

-- Step 2: Add it back as JSONB with proper default
ALTER TABLE "QuickReply" ADD COLUMN "buttons" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Step 3: Verify the fix
-- SELECT id, triggers, buttons FROM "QuickReply";
