-- Add sendSeparately column to QuickReply table
ALTER TABLE "QuickReply" ADD COLUMN IF NOT EXISTS "sendSeparately" BOOLEAN NOT NULL DEFAULT false;
