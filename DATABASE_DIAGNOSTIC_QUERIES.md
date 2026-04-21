# Database Diagnostic Queries - Second Number Issue

## Check All Configured Phone Numbers

### View All Phone Number IDs
```sql
-- See all phone numbers in system
SELECT 
  'MasterConfig' as source,
  id,
  name,
  "phoneNumberId",
  "verifyToken",
  "isActive",
  "createdAt"
FROM "MasterConfig"
UNION ALL
SELECT 
  'WhatsAppSettings' as source,
  id,
  name,
  "phoneNumberId",
  "verifyToken",
  true as "isActive",
  "createdAt"
FROM "WhatsAppSettings"
ORDER BY "createdAt" DESC;
```

**Expected Result:**
- Should see BOTH your phone numbers
- Each should have UNIQUE verify token
- MasterConfig entries should have isActive = true

---

## Check for Duplicate Verify Tokens

### Find Duplicate Tokens (BAD!)
```sql
-- Check MasterConfig
SELECT "verifyToken", COUNT(*) as count
FROM "MasterConfig"
WHERE "isActive" = true
GROUP BY "verifyToken"
HAVING COUNT(*) > 1;

-- Check WhatsAppSettings
SELECT "verifyToken", COUNT(*) as count
FROM "WhatsAppSettings"
GROUP BY "verifyToken"
HAVING COUNT(*) > 1;
```

**Expected Result:**
- Should return NO rows
- If rows appear, you have duplicate tokens (this causes issues!)

---

## Check Specific Phone Number ID

### Search for Your Second Number
```sql
-- Replace 123456789012345 with your actual phone_number_id from logs
SELECT 
  'MasterConfig' as source,
  *
FROM "MasterConfig"
WHERE "phoneNumberId" = '123456789012345'

UNION ALL

SELECT 
  'WhatsAppSettings' as source,
  *
FROM "WhatsAppSettings"
WHERE "phoneNumberId" = '123456789012345';
```

**Expected Result:**
- Should find ONE entry
- If NO entries → This is your problem!
- If MULTIPLE entries → May cause conflicts

---

## Check Feature Assignments

### See Which Numbers Are Assigned to Features
```sql
SELECT 
  id,
  "whatsappChat",
  campaigns,
  ecommerce,
  "aiChatbot",
  "quickReply",
  "createdAt"
FROM "FeatureAssignment";
```

**What to check:**
- Are both phone_number_ids assigned to features?
- Is second number assigned to campaigns or whatsappChat?

---

## Add Second Number (If Missing)

### Insert Second Number into MasterConfig
```sql
-- BEFORE RUNNING: Get these values from Meta Business Manager
-- 1. Phone Number ID (e.g., 123456789012345)
-- 2. Access Token (starts with EAAG...)
-- 3. Create unique verify token (e.g., 'second_number_token_2024')

INSERT INTO "MasterConfig" (
  name,
  "phoneNumberId",
  "accessToken",
  "verifyToken",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  'Second WhatsApp Number',           -- Friendly name
  'YOUR_PHONE_NUMBER_ID_HERE',        -- From Meta Business Manager
  'YOUR_ACCESS_TOKEN_HERE',           -- From Meta Business Manager
  'unique_verify_token_2',            -- Create unique token
  true,                               -- Active
  NOW(),
  NOW()
);
```

**After inserting:**
1. Note the verify token you used
2. Update webhook URL in Meta Business Manager:
   `https://yourdomain.com/whatsapp/webhook/unique_verify_token_2`
3. Restart your backend
4. Test by sending message to second number

---

## Verify Webhook Configuration

### Check Current Webhook Tokens
```sql
-- See all verify tokens
SELECT 
  name,
  "phoneNumberId",
  "verifyToken",
  'MasterConfig' as source
FROM "MasterConfig"
WHERE "isActive" = true

UNION ALL

SELECT 
  name,
  "phoneNumberId",
  "verifyToken",
  'WhatsAppSettings' as source
FROM "WhatsAppSettings";
```

**Match these with Meta Business Manager:**
- Go to Meta Business Manager
- WhatsApp → Configuration → Webhooks
- Webhook URL should be: `https://yourdomain.com/whatsapp/webhook/VERIFY_TOKEN`
- The VERIFY_TOKEN must match database

---

## Check Recent Messages

### See Which Phone Number IDs Are Receiving Messages
```sql
-- Check last 50 messages
SELECT 
  "phoneNumberId",
  direction,
  "from",
  "to",
  message,
  status,
  "createdAt"
FROM "WhatsAppMessage"
ORDER BY "createdAt" DESC
LIMIT 50;
```

**What to check:**
- Are messages from second number appearing?
- What phone_number_id do they have?
- Are they marked as 'incoming' or 'outgoing'?

---

## Check Tenant Configuration (Multi-tenant Setup)

### If Using Multi-tenant Setup
```sql
-- Check central database for tenants
SELECT 
  id,
  email,
  "dbName",
  "isActive"
FROM tenant
WHERE "isActive" = true;
```

**For each tenant, check their database:**
```sql
-- Run this in each tenant database
SELECT 
  id,
  name,
  "phoneNumberId",
  "verifyToken"
FROM "MasterConfig"
WHERE "isActive" = true;
```

---

## Update Existing Configuration

### Update Phone Number ID
```sql
-- If you need to update an existing entry
UPDATE "MasterConfig"
SET 
  "phoneNumberId" = 'NEW_PHONE_NUMBER_ID',
  "updatedAt" = NOW()
WHERE name = 'Second WhatsApp Number';
```

### Update Verify Token
```sql
-- If you need to change verify token
UPDATE "MasterConfig"
SET 
  "verifyToken" = 'new_unique_token',
  "updatedAt" = NOW()
WHERE "phoneNumberId" = 'YOUR_PHONE_NUMBER_ID';
```

**Remember:** After updating verify token, update webhook URL in Meta!

---

## Cleanup Duplicate Entries

### Remove Duplicate Phone Number IDs (CAREFUL!)
```sql
-- First, check what will be deleted
SELECT * FROM "MasterConfig"
WHERE "phoneNumberId" IN (
  SELECT "phoneNumberId"
  FROM "MasterConfig"
  GROUP BY "phoneNumberId"
  HAVING COUNT(*) > 1
)
ORDER BY "phoneNumberId", "createdAt";

-- Keep only the most recent entry for each phone_number_id
-- DELETE older duplicates (run only after verifying above query)
DELETE FROM "MasterConfig"
WHERE id NOT IN (
  SELECT MAX(id)
  FROM "MasterConfig"
  GROUP BY "phoneNumberId"
);
```

---

## Diagnostic Summary Query

### Complete System Overview
```sql
-- Run this to get complete picture
SELECT 
  'Total MasterConfigs' as metric,
  COUNT(*)::text as value
FROM "MasterConfig"
WHERE "isActive" = true

UNION ALL

SELECT 
  'Total WhatsAppSettings' as metric,
  COUNT(*)::text as value
FROM "WhatsAppSettings"

UNION ALL

SELECT 
  'Unique Phone Number IDs' as metric,
  COUNT(DISTINCT "phoneNumberId")::text as value
FROM (
  SELECT "phoneNumberId" FROM "MasterConfig" WHERE "isActive" = true
  UNION
  SELECT "phoneNumberId" FROM "WhatsAppSettings"
) as all_phones

UNION ALL

SELECT 
  'Unique Verify Tokens' as metric,
  COUNT(DISTINCT "verifyToken")::text as value
FROM (
  SELECT "verifyToken" FROM "MasterConfig" WHERE "isActive" = true
  UNION
  SELECT "verifyToken" FROM "WhatsAppSettings"
) as all_tokens

UNION ALL

SELECT 
  'Messages Last 24h' as metric,
  COUNT(*)::text as value
FROM "WhatsAppMessage"
WHERE "createdAt" > NOW() - INTERVAL '24 hours';
```

**Healthy System Should Show:**
- 2 or more phone number IDs
- Same number of unique verify tokens as phone numbers
- Messages appearing in last 24h

---

## Export Configuration for Backup

### Backup Current Configuration
```sql
-- Export all phone number configurations
COPY (
  SELECT 
    name,
    "phoneNumberId",
    "verifyToken",
    "isActive"
  FROM "MasterConfig"
) TO '/tmp/masterconfig_backup.csv' WITH CSV HEADER;
```

---

## Quick Test After Changes

### Verify Your Changes
```sql
-- After adding/updating second number, run this:
SELECT 
  name,
  "phoneNumberId",
  "verifyToken",
  "isActive",
  CASE 
    WHEN "phoneNumberId" = 'YOUR_FIRST_NUMBER_ID' THEN '✅ First Number'
    WHEN "phoneNumberId" = 'YOUR_SECOND_NUMBER_ID' THEN '✅ Second Number'
    ELSE '❓ Unknown'
  END as status
FROM "MasterConfig"
WHERE "isActive" = true
ORDER BY "createdAt";
```

Replace `YOUR_FIRST_NUMBER_ID` and `YOUR_SECOND_NUMBER_ID` with actual values.

---

## Common Issues Found by These Queries

1. **No entry for second phone_number_id** → Add using INSERT query above
2. **Duplicate verify tokens** → Update one to be unique
3. **isActive = false** → Update to true
4. **Wrong phone_number_id** → Update with correct value from Meta
5. **Missing access token** → Add from Meta Business Manager

---

## Next Steps After Running Queries

1. ✅ Verify both phone numbers exist in database
2. ✅ Verify each has unique verify token
3. ✅ Update webhook URLs in Meta Business Manager
4. ✅ Restart backend server
5. ✅ Send test message to second number
6. ✅ Check backend logs for webhook receipt
7. ✅ Verify message appears in database
