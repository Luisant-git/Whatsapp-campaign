-- First create the basic table structure
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "duration" INTEGER NOT NULL,
  "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns
ALTER TABLE "SubscriptionPlan" 
ADD COLUMN IF NOT EXISTS "userLimit" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "menuPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add unique constraint on name
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_name_key" UNIQUE ("name");

-- Add flow-manager to existing plans
UPDATE "SubscriptionPlan" 
SET "menuPermissions" = array_append("menuPermissions", 'flow-manager')
WHERE NOT ('flow-manager' = ANY("menuPermissions"));

-- Insert default plans
INSERT INTO "SubscriptionPlan" ("name", "price", "duration", "userLimit", "features", "menuPermissions", "isActive")
VALUES 
  ('Basic Plan', 9.99, 30, 1, 
   ARRAY['WhatsApp Integration', 'Contact Management'], 
   ARRAY['analytics', 'chats', 'contacts.all', 'quick-reply', 'flow-manager', 'settings.master-config'],
   true),
   
  ('Standard Plan', 29.99, 30, 5, 
   ARRAY['WhatsApp Integration', 'Contact Management', 'Campaign Management', 'Flow Manager'], 
   ARRAY['analytics', 'chats', 'contacts.all', 'contacts.blacklist', 'contacts.ungrouped', 'campaigns.bulk', 'campaigns.reports', 'quick-reply', 'flow-manager', 'settings.master-config', 'settings.templates', 'settings.labels'],
   true),
   
  ('Premium Plan', 59.99, 30, 15, 
   ARRAY['WhatsApp Integration', 'Contact Management', 'Campaign Management', 'Flow Manager', 'AI Chatbot', 'E-Commerce'], 
   ARRAY['analytics', 'chats', 'contacts.all', 'contacts.blacklist', 'contacts.ungrouped', 'campaigns.bulk', 'campaigns.reports', 'chatbot', 'quick-reply', 'flow-manager', 'ecommerce.categories', 'ecommerce.products', 'ecommerce.orders', 'ecommerce.customers', 'settings.master-config', 'settings.templates', 'settings.labels', 'settings.createuser'],
   true)
   
ON CONFLICT ("name") DO UPDATE SET
  "menuPermissions" = EXCLUDED."menuPermissions",
  "features" = EXCLUDED."features",
  "userLimit" = EXCLUDED."userLimit";

-- Verify the setup
SELECT "name", "price", "userLimit", "features", "menuPermissions" 
FROM "SubscriptionPlan" 
ORDER BY "price" ASC;