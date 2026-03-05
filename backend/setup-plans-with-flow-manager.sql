-- Add flow-manager to all existing subscription plans that don't already have it
UPDATE "SubscriptionPlan" 
SET "menuPermissions" = array_append("menuPermissions", 'flow-manager')
WHERE NOT ('flow-manager' = ANY("menuPermissions"));

-- Create default plans if they don't exist
INSERT INTO "SubscriptionPlan" ("name", "price", "duration", "userLimit", "features", "menuPermissions", "isActive")
VALUES 
  -- Basic Plan
  ('Basic Plan', 9.99, 30, 1, 
   ARRAY['WhatsApp Integration', 'Contact Management'], 
   ARRAY['analytics', 'chats', 'contacts.all', 'quick-reply', 'flow-manager', 'settings.master-config'],
   true),
   
  -- Standard Plan  
  ('Standard Plan', 29.99, 30, 5, 
   ARRAY['WhatsApp Integration', 'Contact Management', 'Campaign Management', 'Flow Manager'], 
   ARRAY['analytics', 'chats', 'contacts.all', 'contacts.blacklist', 'contacts.ungrouped', 'campaigns.bulk', 'campaigns.reports', 'quick-reply', 'flow-manager', 'settings.master-config', 'settings.templates', 'settings.labels'],
   true),
   
  -- Premium Plan
  ('Premium Plan', 59.99, 30, 15, 
   ARRAY['WhatsApp Integration', 'Contact Management', 'Campaign Management', 'Flow Manager', 'AI Chatbot', 'E-Commerce'], 
   ARRAY['analytics', 'chats', 'contacts.all', 'contacts.blacklist', 'contacts.ungrouped', 'campaigns.bulk', 'campaigns.reports', 'chatbot', 'quick-reply', 'flow-manager', 'ecommerce.categories', 'ecommerce.products', 'ecommerce.orders', 'ecommerce.customers', 'settings.master-config', 'settings.templates', 'settings.labels', 'settings.createuser'],
   true)
   
ON CONFLICT ("name") DO UPDATE SET
  "menuPermissions" = EXCLUDED."menuPermissions",
  "features" = EXCLUDED."features";

-- Verify all plans have flow-manager
SELECT "name", "price", "features", "menuPermissions" 
FROM "SubscriptionPlan" 
ORDER BY "price" ASC;