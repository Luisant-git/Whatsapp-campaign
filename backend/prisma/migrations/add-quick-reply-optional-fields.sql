-- Add title and response columns as optional to QuickReply table
ALTER TABLE "QuickReply" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "QuickReply" ADD COLUMN IF NOT EXISTS "response" TEXT;
