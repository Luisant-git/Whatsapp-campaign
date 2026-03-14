-- Update tenant with phoneNumberId from Master Config
-- Run this on whatsapp_central database
UPDATE "Tenant" 
SET "phoneNumberId" = '803957376127788' 
WHERE id = 2;
