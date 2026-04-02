-- Copy WhatsApp settings from tenant 6 (SNP) to tenant 2 (company)
-- Run this on tenant 2 database after getting the settings from tenant 6

-- First, get settings from tenant 6 database:
-- SELECT * FROM "WhatsAppSettings" LIMIT 1;

-- Then insert into tenant 2 database:
INSERT INTO "WhatsAppSettings" (
    "name",
    "templateName", 
    "phoneNumberId",
    "accessToken",
    "verifyToken",
    "apiUrl",
    "language",
    "confirmationTemplate",
    "isDefault",
    "createdAt",
    "updatedAt"
) 
SELECT 
    'Company Settings' as "name",
    "templateName",
    "phoneNumberId", 
    "accessToken",
    "verifyToken",
    "apiUrl",
    "language",
    COALESCE("confirmationTemplate", 'enquiry_received_1') as "confirmationTemplate",
    true as "isDefault",
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM tenant_6_database."WhatsAppSettings" 
LIMIT 1;