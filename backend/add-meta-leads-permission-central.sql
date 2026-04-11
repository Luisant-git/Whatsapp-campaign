-- Run this on CENTRAL database only (not tenant databases)
-- This adds campaigns.meta-leads permission to all subscriptions

UPDATE "Subscription" 
SET "menuPermissions" = array_append("menuPermissions", 'campaigns.meta-leads')
WHERE NOT ('campaigns.meta-leads' = ANY("menuPermissions"));

-- Verify the update
SELECT id, "tenantId", "menuPermissions" 
FROM "Subscription" 
WHERE 'campaigns.meta-leads' = ANY("menuPermissions")
LIMIT 10;
