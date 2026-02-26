-- 1. Check FeatureAssignment
SELECT 'FeatureAssignment:' as info;
SELECT * FROM "FeatureAssignment";

-- 2. Check WhatsApp Settings for webhook-2
SELECT 'WhatsApp Settings for 916429964876580:' as info;
SELECT id, name, "phoneNumberId", "verifyToken", "accessToken" != '' as has_token 
FROM "WhatsAppSettings" 
WHERE "phoneNumberId" = '916429964876580';

-- 3. Check recent messages for webhook-2
SELECT 'Recent messages for 916429964876580:' as info;
SELECT id, "from", message, direction, status, "phoneNumberId", "createdAt"
FROM "WhatsAppMessage" 
WHERE "phoneNumberId" = '916429964876580'
ORDER BY "createdAt" DESC 
LIMIT 5;

-- 4. Check if webhook-2 is in campaigns column
SELECT 'Is 916429964876580 in campaigns?' as info;
SELECT 
  CASE 
    WHEN "campaigns" = '916429964876580' THEN 'YES - THIS IS THE PROBLEM!'
    ELSE 'No'
  END as result
FROM "FeatureAssignment";
