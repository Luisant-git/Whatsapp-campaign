-- Add useQuickReply column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "useQuickReply" BOOLEAN NOT NULL DEFAULT true;
