-- Fix webhook -2 (916429964876580) to receive messages
-- This script checks and updates the FeatureAssignment configuration

-- Step 1: Check current feature assignments
SELECT * FROM "FeatureAssignment";

-- Step 2: Option A - If you want webhook-2 to handle WhatsApp Chat (one-to-one messaging)
-- UPDATE "FeatureAssignment" 
-- SET "whatsappChat" = '916429964876580'
-- WHERE id = 1;

-- Step 2: Option B - If you want webhook-2 to handle all features (default behavior)
-- Set it to NULL or empty string so it's not restricted to campaigns-only
UPDATE "FeatureAssignment" 
SET "campaigns" = CASE 
    WHEN "campaigns" = '916429964876580' THEN NULL 
    ELSE "campaigns" 
END
WHERE id = 1;

-- Step 3: Verify the change
SELECT * FROM "FeatureAssignment";

-- EXPLANATION:
-- - If a phone number is assigned to "campaigns", it will ONLY send bulk messages
-- - If a phone number is assigned to "whatsappChat", it will handle incoming/outgoing messages
-- - If a phone number is NOT assigned to any feature, it will handle ALL features (default)

-- RECOMMENDED CONFIGURATION:
-- Webhook-1 (803957376127788): whatsappChat (for customer conversations)
-- Webhook-2 (916429964876580): campaigns (for bulk messaging) OR whatsappChat (for conversations)
