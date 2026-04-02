-- Step 1: Connect to PostgreSQL and run these commands

-- First, let's see what tenants we have
SELECT id, name, "dbName", "dbHost", "dbPort", "dbUser" FROM whatsapp_campaign.tenant WHERE id IN (2, 6);

-- Step 2: Get the WhatsApp settings from tenant 6 (SNP)
-- Connect to tenant 6 database and run:
-- \c [tenant_6_database_name]
-- SELECT * FROM "WhatsAppSettings";

-- Step 3: Copy the settings to tenant 2 (company)
-- Connect to tenant 2 database and run:
-- \c [tenant_2_database_name]

-- Insert the copied settings (replace values from step 2)
INSERT INTO "WhatsAppSettings" (
    "name",
    "templateName", 
    "phoneNumberId",
    "accessToken",
    "verifyToken",
    "apiUrl",
    "language",
    "headerImageUrl",
    "confirmationTemplate",
    "isDefault",
    "masterConfigId",
    "createdAt",
    "updatedAt"
) VALUES (
    'Company Settings',
    'hello_world',  -- Replace with actual templateName from tenant 6
    '803957376127788',  -- Replace with actual phoneNumberId from tenant 6
    'ACTUAL_ACCESS_TOKEN_FROM_TENANT_6',  -- Replace with actual accessToken
    'ACTUAL_VERIFY_TOKEN_FROM_TENANT_6',  -- Replace with actual verifyToken
    'https://graph.facebook.com/v18.0',
    'en',
    NULL,  -- Replace with actual headerImageUrl if any
    'enquiry_received_1',  -- Template for confirmations
    true,
    NULL,  -- Replace with actual masterConfigId if any
    NOW(),
    NOW()
);

-- Step 4: Verify the settings were copied
SELECT * FROM "WhatsAppSettings";