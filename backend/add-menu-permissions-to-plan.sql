-- Add menuPermissions column to SubscriptionPlan table
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "menuPermissions" TEXT[] DEFAULT '{}';
