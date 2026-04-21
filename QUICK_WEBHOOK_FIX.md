# Quick Webhook Troubleshooting - Second Number

## 🚨 IMMEDIATE CHECKS

### 1. Is Meta Sending Webhooks?

**Send message to second number, then check logs for:**
```
=== WEBHOOK POST RECEIVED ===
```

- ✅ **YES** → Meta is sending, continue to step 2
- ❌ **NO** → Meta is NOT sending webhooks

**Fix if NO:**
- Check Meta Business Manager → WhatsApp → Configuration → Webhooks
- Verify webhook URL: `https://yourdomain.com/whatsapp/webhook/YOUR_TOKEN`
- Click "Test" button in Meta
- Ensure server is publicly accessible (not localhost)

---

### 2. What Phone Number ID is Receiving?

**Look for this in logs:**
```
📞 Phone Number ID: 123456789012345
```

**Copy this number and check your database:**

```sql
-- Does this phone_number_id exist?
SELECT * FROM "MasterConfig" WHERE "phoneNumberId" = '123456789012345';
SELECT * FROM "WhatsAppSettings" WHERE "phoneNumberId" = '123456789012345';
```

- ✅ **FOUND** → Continue to step 3
- ❌ **NOT FOUND** → This is your problem!

**Fix if NOT FOUND:**
```sql
-- Add to MasterConfig
INSERT INTO "MasterConfig" 
  (name, "phoneNumberId", "accessToken", "verifyToken", "isActive")
VALUES 
  ('Second Number', '123456789012345', 'YOUR_ACCESS_TOKEN', 'unique_token_2', true);
```

---

### 3. Is User Found?

**Look for this in logs:**
```
✅ PROCESSING MESSAGE for user ID: 2
```

**OR**

```
❌ NO USER FOUND - Message ignored
```

- ✅ **USER FOUND** → Working correctly!
- ❌ **NO USER FOUND** → Check verify token mapping

**Fix if NO USER FOUND:**

1. Check if verify token is unique:
```sql
SELECT "verifyToken", COUNT(*) 
FROM "MasterConfig" 
GROUP BY "verifyToken" 
HAVING COUNT(*) > 1;
```

2. Each number needs unique token:
   - Number 1: `https://yourdomain.com/whatsapp/webhook/TOKEN_1`
   - Number 2: `https://yourdomain.com/whatsapp/webhook/TOKEN_2`

---

## 🔍 DETAILED USER LOOKUP

**Look for this section in logs:**
```
🔍 SEARCHING FOR USERS WITH phone_number_id: 123456789012345
→ Found 2 active tenants to search

  ✅ Tenant 1: Found 1 Master Configs
     - MasterConfig: Second Number, PhoneID: 123456789012345

📊 TOTAL USERS FOUND: 1
User IDs: 2
```

**What this tells you:**
- Which tenant has this phone_number_id
- Whether it's in MasterConfig or WhatsAppSettings
- Which user ID will process the message

---

## 🎯 MOST COMMON ISSUE

**Problem:** Second number's phone_number_id not in database

**Symptoms:**
```
❌ NO USER FOUND - Message ignored
Phone Number ID: 123456789012345
```

**Solution:**
1. Get phone_number_id from Meta Business Manager
2. Add to database:
```sql
INSERT INTO "MasterConfig" 
  (name, "phoneNumberId", "accessToken", "verifyToken", "isActive")
VALUES 
  ('Second Number', 'YOUR_PHONE_NUMBER_ID', 'YOUR_ACCESS_TOKEN', 'unique_verify_token', true);
```
3. Update webhook URL in Meta:
   `https://yourdomain.com/whatsapp/webhook/unique_verify_token`
4. Restart backend
5. Test again

---

## 📋 VERIFICATION CHECKLIST

Before testing:
- [ ] Second number added to Meta Business Manager
- [ ] Phone number ID copied from Meta
- [ ] Phone number ID added to database (MasterConfig or WhatsAppSettings)
- [ ] Unique verify token created for second number
- [ ] Webhook URL updated in Meta with new token
- [ ] Backend restarted
- [ ] Webhook subscription active in Meta

---

## 🧪 TEST COMMAND

Send test webhook manually:
```bash
curl -X POST https://yourdomain.com/whatsapp/webhook/YOUR_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{"metadata":{"phone_number_id":"123456789012345"},"messages":[{"from":"919876543210","id":"test123","type":"text","text":{"body":"test"}}]}}]}]}'
```

Watch backend logs for response.

---

## 🆘 STILL NOT WORKING?

1. **Copy full log output** when sending message to second number
2. **Check these specific lines:**
   - `Phone Number ID:` → Is this your second number?
   - `TOTAL USERS FOUND:` → Is this 0 or greater than 0?
   - `NO USER FOUND` → This means phone_number_id not in database

3. **Compare with first number:**
   - Send message to first number
   - Compare phone_number_id in logs
   - Both should be different
   - Both should exist in database

---

## 💡 KEY INSIGHT

**Your send works because:**
- You manually specify phone_number_id when sending
- Example: `916429964876580`

**Your receive fails because:**
- Backend must look up which user owns that phone_number_id
- If phone_number_id not in database → No user found → Message ignored

**Solution:**
- Add second number's phone_number_id to database
- Map it to correct user/tenant
- Use unique verify token for webhook routing
