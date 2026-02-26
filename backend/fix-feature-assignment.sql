-- Check current FeatureAssignment
SELECT * FROM "FeatureAssignment";

-- If empty, create default (all NULL = all features enabled for all numbers)
INSERT INTO "FeatureAssignment" (
  "whatsappChat", 
  "aiChatbot", 
  "quickReply", 
  "ecommerce", 
  "campaigns",
  "createdAt",
  "updatedAt"
)
SELECT 
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "FeatureAssignment");

-- Verify
SELECT * FROM "FeatureAssignment";
