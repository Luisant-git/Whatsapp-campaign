-- Update Standard Plan to include flow-manager permission
UPDATE "SubscriptionPlan" 
SET "menuPermissions" = array_append("menuPermissions", 'flow-manager')
WHERE "name" = 'Standard Plan' 
AND NOT ('flow-manager' = ANY("menuPermissions"));

-- If Standard Plan doesn't exist, create it with flow-manager included
INSERT INTO "SubscriptionPlan" ("name", "price", "duration", "userLimit", "features", "menuPermissions", "isActive")
SELECT 'Standard Plan', 29.99, 30, 5, 
       ARRAY['WhatsApp Integration', 'Contact Management', 'Campaign Management', 'Flow Manager'], 
       ARRAY['analytics', 'chats', 'contacts.all', 'contacts.blacklist', 'contacts.ungrouped', 'campaigns.bulk', 'campaigns.reports', 'quick-reply', 'flow-manager', 'settings.master-config', 'settings.templates', 'settings.labels'],
       true
WHERE NOT EXISTS (SELECT 1 FROM "SubscriptionPlan" WHERE "name" = 'Standard Plan');

-- Verify the update
SELECT "name", "menuPermissions" FROM "SubscriptionPlan" WHERE "name" = 'Standard Plan';