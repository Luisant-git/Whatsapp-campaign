-- ============================================
-- Enable Meta Leads Menu for All Users
-- ============================================

-- Step 1: Add to Subscription table (Central DB)
UPDATE "Subscription" 
SET "menuPermissions" = array_append("menuPermissions", 'campaigns.meta-leads')
WHERE NOT ('campaigns.meta-leads' = ANY("menuPermissions"));

-- Step 2: Verify subscriptions updated
SELECT id, "tenantId", "menuPermissions" 
FROM "Subscription" 
WHERE 'campaigns.meta-leads' = ANY("menuPermissions")
LIMIT 10;

-- Step 3: If you have MenuPermission table for subusers
-- UPDATE "MenuPermission"
-- SET "permission" = jsonb_set(
--   COALESCE("permission"::jsonb, '{}'::jsonb),
--   '{campaigns.meta-leads}',
--   'true'::jsonb
-- );

-- Step 4: Quick test - Check your current subscription
SELECT * FROM "Subscription" WHERE "isActive" = true LIMIT 1;

-- ============================================
-- Manual Alternative: Add for specific tenant
-- ============================================
-- Replace YOUR_TENANT_ID with your actual tenant ID

-- UPDATE "Subscription" 
-- SET "menuPermissions" = array_append("menuPermissions", 'campaigns.meta-leads')
-- WHERE "tenantId" = 'YOUR_TENANT_ID';
