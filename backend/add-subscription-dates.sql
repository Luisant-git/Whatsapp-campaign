-- Add subscription start and end date fields to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "subscriptionStartDate" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "subscriptionEndDate" TIMESTAMP;
