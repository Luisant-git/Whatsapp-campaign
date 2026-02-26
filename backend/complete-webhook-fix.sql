-- DIAGNOSTIC FOR WEBHOOK 916429964876580
-- Run: sudo -u postgres psql -d tenant_user_example_com -f complete-webhook-fix.sql

\echo '=== 1. CHECK FEATURE ASSIGNMENT ==='
SELECT * FROM "FeatureAssignment";

\echo ''
\echo '=== 2. CHECK WEBHOOK-2 SETTINGS ==='
SELECT id, name, "phoneNumberId", "verifyToken" 
FROM "WhatsAppSettings" 
WHERE "phoneNumberId" = '916429964876580';

\echo ''
\echo '=== 3. CHECK RECENT INCOMING MESSAGES ==='
SELECT id, "from", message, direction, "phoneNumberId", "createdAt"
FROM "WhatsAppMessage" 
WHERE "phoneNumberId" = '916429964876580' 
  AND direction = 'incoming'
ORDER BY "createdAt" DESC 
LIMIT 3;

\echo ''
\echo '=== 4. FIX: REMOVE CAMPAIGNS-ONLY RESTRICTION ==='
UPDATE "FeatureAssignment" 
SET "campaigns" = NULL 
WHERE "campaigns" = '916429964876580';

\echo ''
\echo '=== 5. VERIFY FIX ==='
SELECT 
  id,
  "whatsappChat",
  "campaigns",
  "aiChatbot",
  "quickReply",
  "ecommerce"
FROM "FeatureAssignment";

\echo ''
\echo '=== RESULT ==='
\echo 'If campaigns column is now NULL or different number, webhook-2 can receive messages'
\echo 'Next step: Restart backend with: pm2 restart all'
