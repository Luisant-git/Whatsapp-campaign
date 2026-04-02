-- Connect to tenant ID 2 database and run this SQL
-- Replace the values with your actual WhatsApp Business API credentials

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
) VALUES (
    'Default Settings',
    'hello_world',
    '803957376127788',  -- Your phone number ID from the logs
    'YOUR_ACCESS_TOKEN_HERE',  -- Replace with your actual access token
    'YOUR_VERIFY_TOKEN_HERE',  -- Replace with your verify token
    'https://graph.facebook.com/v18.0',
    'en',
    'enquiry_received_1',  -- Template for appointment confirmations
    true,
    NOW(),
    NOW()
);