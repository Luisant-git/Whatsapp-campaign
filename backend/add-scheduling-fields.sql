-- Add scheduling fields to Campaign table
ALTER TABLE "Campaign" 
ADD COLUMN "scheduleType" TEXT NOT NULL DEFAULT 'one-time',
ADD COLUMN "scheduledDays" TEXT[] DEFAULT '{}',
ADD COLUMN "scheduledTime" TEXT;

-- Update existing campaigns to have default scheduling values
UPDATE "Campaign" 
SET "scheduleType" = 'one-time', 
    "scheduledDays" = '{}' 
WHERE "scheduleType" IS NULL;