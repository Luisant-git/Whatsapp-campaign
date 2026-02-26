-- Step 1: Check if FeatureAssignment exists
SELECT COUNT(*) as "Total Records" FROM "FeatureAssignment";

-- Step 2: Check WhatsApp Settings
SELECT id, name, "phoneNumberId", "verifyToken" FROM "WhatsAppSettings";

-- Step 3: Create default FeatureAssignment if not exists
INSERT INTO "FeatureAssignment" (
  "userId", 
  "whatsappChat", 
  "aiChatbot", 
  "quickReply", 
  "ecommerce", 
  "campaigns",
  "createdAt",
  "updatedAt"
)
SELECT 
  1,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "FeatureAssignment");

-- Step 4: Verify
SELECT * FROM "FeatureAssignment";

-- RESULT: All phone numbers will now handle ALL features (send & receive)
