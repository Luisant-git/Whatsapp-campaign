-- Migration: Update QuickReply buttons column from String[] to JSONB

-- Step 1: Create a temporary column
ALTER TABLE "QuickReply" ADD COLUMN "buttons_temp" JSONB;

-- Step 2: Convert existing string array data to JSON array format
UPDATE "QuickReply" 
SET "buttons_temp" = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', 'reply',
      'text', elem,
      'value', ''
    )
  )
  FROM unnest(buttons) AS elem
);

-- Step 3: Drop old column
ALTER TABLE "QuickReply" DROP COLUMN "buttons";

-- Step 4: Rename temp column to buttons
ALTER TABLE "QuickReply" RENAME COLUMN "buttons_temp" TO "buttons";

-- Step 5: Set NOT NULL constraint if needed
ALTER TABLE "QuickReply" ALTER COLUMN "buttons" SET NOT NULL;
