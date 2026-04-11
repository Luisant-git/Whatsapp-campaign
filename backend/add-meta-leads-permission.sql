-- Add campaigns.meta-leads to all existing subscriptions
-- This will enable Meta Leads menu for all users

-- For central database (if you store subscriptions there)
UPDATE "Subscription" 
SET "menuPermissions" = array_append("menuPermissions", 'campaigns.meta-leads')
WHERE NOT ('campaigns.meta-leads' = ANY("menuPermissions"));

-- Alternative: If menuPermissions is stored as JSON
-- UPDATE "Subscription" 
-- SET "menuPermissions" = jsonb_insert("menuPermissions"::jsonb, '{-1}', '"campaigns.meta-leads"')
-- WHERE NOT ("menuPermissions"::jsonb ? 'campaigns.meta-leads');

-- Verify the update
SELECT id, "menuPermissions" FROM "Subscription" LIMIT 5;
