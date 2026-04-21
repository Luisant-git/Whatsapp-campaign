# Second WhatsApp Number - Complete Troubleshooting Guide

## 🎯 Problem Summary

**Symptom:** Messages sent TO second number work, but messages RECEIVED FROM customers to second number don't appear in backend.

**Root Cause:** Backend receives webhook but cannot find which user/tenant owns that phone_number_id.

---

## 📋 What Was Added

### Enhanced Logging in Backend

**Files Modified:**
1. `backend/src/whatsapp/whatsapp.controller.ts` - Webhook routes
2. `backend/src/whatsapp/whatsapp.service.ts` - User lookup methods

**New Log Output:**
- Full webhook payload from Meta
- Phone number ID receiving messages
- Step-by-step user lookup process
- Detailed database search results
- Clear success/failure indicators

---

## 🚀 Quick Start - 3 Steps to Fix

### Step 1: Send Test Message
Send a WhatsApp message from your phone to the second number.

### Step 2: Check Backend Logs
Look for this in your backend console:
```
📞 Phone Number ID: 123456789012345
```
Copy this number.

### Step 3: Check Database
```sql
SELECT * FROM "MasterConfig" WHERE "phoneNumberId" = '123456789012345';
```

**If NO results:**
```sql
INSERT INTO "MasterConfig" 
  (name, "phoneNumberId", "accessToken", "verifyToken", "isActive")
VALUES 
  ('Second Number', '123456789012345', 'YOUR_TOKEN', 'unique_token_2', true);
```

Then update webhook URL in Meta Business Manager and restart backend.

---

## 📚 Documentation Files Created

### 1. WEBHOOK_DEBUGGING_GUIDE.md
**Comprehensive guide covering:**
- What each log section means
- How to interpret webhook logs
- Common issues and solutions
- Testing checklist
- Diagnostic commands

**Use when:** You need detailed explanation of logs

### 2. QUICK_WEBHOOK_FIX.md
**Quick reference card with:**
- Immediate checks (3 steps)
- Most common issue and fix
- Verification checklist
- Test commands

**Use when:** You need fast troubleshooting

### 3. DATABASE_DIAGNOSTIC_QUERIES.md
**SQL queries for:**
- Checking all phone numbers
- Finding duplicates
- Adding second number
- Verifying configuration
- Backup and export

**Use when:** You need to inspect/fix database

---

## 🔍 How to Use the Enhanced Logging

### Start Backend in Dev Mode
```bash
cd backend
npm run start:dev
```

### Send Message to Second Number
Use your personal phone to send "test" to the second WhatsApp number.

### Read the Logs (in order)

#### 1. Webhook Receipt
```
=== WEBHOOK POST RECEIVED (WITH TOKEN) ===
Timestamp: 2024-01-15T10:30:00.000Z
Verify Token: your_verify_token
🔍 FULL WEBHOOK BODY: {...}
```
✅ **If you see this:** Meta is sending webhooks correctly
❌ **If you DON'T see this:** Meta is not sending webhooks (check Meta Business Manager)

#### 2. Message Detection
```
🔔 MESSAGE DETECTED
📞 Phone Number ID: 123456789012345
📞 Display Phone: +1234567890
👤 From: 919876543210
📝 Message Type: text
🔑 Verify Token Used: your_token
```
✅ **Copy the Phone Number ID** - you'll need this

#### 3. User Lookup
```
🔍 USER LOOKUP PROCESS:
Step 1: Looking up by verify token: your_token
→ User ID from verify token: NOT FOUND

Step 2: Looking up by phone_number_id: 123456789012345
→ User IDs from phone_number_id: NOT FOUND

Step 3: Using fallback to first active user
→ Fallback user ID: 1
```

**This tells you:**
- Which lookup method succeeded
- If phone_number_id is in database
- Which user will process the message

#### 4. Detailed Search
```
🔍 SEARCHING FOR USERS WITH phone_number_id: 123456789012345
→ Found 2 active tenants to search

  ❌ Tenant 1: No matching phone_number_id
  ❌ Tenant 2: No matching phone_number_id

📊 TOTAL USERS FOUND: 0
User IDs: NONE
```

**If TOTAL USERS FOUND: 0** → Your second number is NOT in database!

#### 5. Final Result
```
❌ NO USER FOUND - Message ignored
Phone Number ID: 123456789012345
Verify Token: your_token
```

**This confirms:** Backend received webhook but couldn't process it.

---

## 🛠️ Step-by-Step Fix Process

### Step 1: Identify the Phone Number ID

**From Backend Logs:**
```
📞 Phone Number ID: 123456789012345
```

**OR from Meta Business Manager:**
1. Go to Meta Business Manager
2. WhatsApp → Phone Numbers
3. Click on second number
4. Copy "Phone Number ID"

### Step 2: Check if It's in Database

**Run this SQL:**
```sql
SELECT 
  name,
  "phoneNumberId",
  "verifyToken",
  "isActive"
FROM "MasterConfig"
WHERE "phoneNumberId" = '123456789012345';
```

**Result:**
- ✅ **Found:** Continue to Step 4
- ❌ **Not Found:** Continue to Step 3

### Step 3: Add Second Number to Database

**Get Required Information:**
1. Phone Number ID: `123456789012345` (from Step 1)
2. Access Token: Get from Meta Business Manager → System Users
3. Verify Token: Create unique string, e.g., `second_number_webhook_2024`

**Run this SQL:**
```sql
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
  'Second WhatsApp Number',
  '123456789012345',              -- Your phone number ID
  'EAAG...your_access_token',     -- Your access token
  'second_number_webhook_2024',   -- Your unique verify token
  true,
  NOW(),
  NOW()
);
```

### Step 4: Update Webhook URL in Meta

**For Second Number:**
1. Go to Meta Business Manager
2. WhatsApp → Configuration → Webhooks
3. Edit webhook URL to:
   ```
   https://yourdomain.com/whatsapp/webhook/second_number_webhook_2024
   ```
4. Subscribe to: `messages` field
5. Click "Verify and Save"

### Step 5: Restart Backend

```bash
# Stop backend (Ctrl+C)
# Start again
npm run start:dev
```

### Step 6: Test Again

1. Send message to second number
2. Check backend logs
3. Should now see:
   ```
   ✅ PROCESSING MESSAGE for user ID: X
   ```

---

## 🎯 Most Common Issues

### Issue 1: Webhook Not Received

**Symptoms:**
- No logs appear when sending message
- No "WEBHOOK POST RECEIVED" in console

**Causes:**
- Webhook not subscribed in Meta
- Wrong webhook URL
- Server not accessible from internet

**Fix:**
1. Check Meta Business Manager → Webhooks
2. Verify URL is correct
3. Click "Test" button in Meta
4. Check server firewall/ports

### Issue 2: Phone Number ID Not in Database

**Symptoms:**
```
❌ NO USER FOUND - Message ignored
📊 TOTAL USERS FOUND: 0
```

**Causes:**
- Second number not added to MasterConfig
- Wrong phone_number_id in database

**Fix:**
- Run INSERT query from Step 3 above
- Verify phone_number_id matches Meta exactly

### Issue 3: Duplicate Verify Tokens

**Symptoms:**
- Both numbers receive same messages
- Messages go to wrong user

**Causes:**
- Both numbers using same verify token
- Webhook URL not updated

**Fix:**
```sql
-- Check for duplicates
SELECT "verifyToken", COUNT(*) 
FROM "MasterConfig" 
GROUP BY "verifyToken" 
HAVING COUNT(*) > 1;

-- Update second number with unique token
UPDATE "MasterConfig"
SET "verifyToken" = 'unique_token_2'
WHERE "phoneNumberId" = '123456789012345';
```

Then update webhook URL in Meta.

### Issue 4: Wrong User Receives Messages

**Symptoms:**
- Messages from second number appear in first user's account

**Causes:**
- Fallback to first active user
- No specific mapping for second number

**Fix:**
- Ensure second number is in database
- Verify unique verify token
- Check webhook URL in Meta

---

## ✅ Verification Checklist

Before considering it fixed:

- [ ] Second number exists in Meta Business Manager
- [ ] Phone Number ID copied from Meta
- [ ] Phone Number ID exists in database (MasterConfig or WhatsAppSettings)
- [ ] Unique verify token created for second number
- [ ] Webhook URL updated in Meta with new verify token
- [ ] Webhook subscribed to "messages" field
- [ ] Backend restarted after database changes
- [ ] Test message sent to second number
- [ ] Backend logs show "WEBHOOK POST RECEIVED"
- [ ] Backend logs show "PROCESSING MESSAGE for user ID: X"
- [ ] Message appears in database
- [ ] Message appears in frontend

---

## 🧪 Testing Commands

### Test Webhook Manually
```bash
curl -X POST https://yourdomain.com/whatsapp/webhook/YOUR_VERIFY_TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "field": "messages",
        "value": {
          "metadata": {
            "phone_number_id": "123456789012345",
            "display_phone_number": "+1234567890"
          },
          "messages": [{
            "from": "919876543210",
            "id": "test_' $(date +%s) '",
            "type": "text",
            "text": { "body": "test message" }
          }],
          "contacts": [{
            "profile": { "name": "Test User" }
          }]
        }
      }]
    }]
  }'
```

### Check Database After Test
```sql
-- See if message was stored
SELECT * FROM "WhatsAppMessage" 
WHERE "phoneNumberId" = '123456789012345'
ORDER BY "createdAt" DESC 
LIMIT 5;
```

---

## 📊 Success Indicators

### In Backend Logs
```
=== WEBHOOK POST RECEIVED (WITH TOKEN) ===
🔔 MESSAGE DETECTED
📞 Phone Number ID: 123456789012345
🔍 USER LOOKUP PROCESS:
Step 2: Looking up by phone_number_id: 123456789012345
→ User IDs from phone_number_id: [2]
✅ PROCESSING MESSAGE for user ID: 2
```

### In Database
```sql
-- Should return rows
SELECT * FROM "WhatsAppMessage" 
WHERE "phoneNumberId" = '123456789012345'
AND direction = 'incoming';
```

### In Frontend
- Message appears in chat list
- Correct phone number shown
- Message content visible

---

## 🆘 Still Not Working?

### Collect This Information:

1. **Backend Logs** (full output when sending test message)
2. **Database Query Results:**
   ```sql
   SELECT * FROM "MasterConfig";
   SELECT * FROM "WhatsAppSettings";
   ```
3. **Meta Configuration:**
   - Webhook URL
   - Subscribed fields
   - Phone Number IDs

4. **Test Results:**
   - Does first number work?
   - Does second number send work?
   - Does second number receive work?

### Common Patterns:

**Pattern 1: No logs at all**
→ Meta not sending webhooks (check Meta configuration)

**Pattern 2: Logs show "NO USER FOUND"**
→ Phone number ID not in database (run INSERT query)

**Pattern 3: Logs show wrong user ID**
→ Verify token not unique (update verify token)

**Pattern 4: Messages go to wrong account**
→ Fallback to first user (add specific mapping)

---

## 📝 Summary

**The Problem:**
- Sending works because you specify phone_number_id
- Receiving fails because backend must look up phone_number_id
- If phone_number_id not in database → No user found → Message ignored

**The Solution:**
1. Add second number's phone_number_id to database
2. Create unique verify token
3. Update webhook URL in Meta
4. Restart backend
5. Test and verify logs

**The Verification:**
- Backend logs show "PROCESSING MESSAGE"
- Database has incoming messages
- Frontend displays messages correctly

---

## 🎓 Understanding the Flow

### Sending (Works)
```
Frontend → Backend → Meta API
         ↓
    Specify phone_number_id: 123456789012345
         ↓
    Meta sends from that number
```

### Receiving (Needs Fix)
```
Customer → Meta → Webhook → Backend
                    ↓
            Contains phone_number_id: 123456789012345
                    ↓
            Backend looks up: Who owns this ID?
                    ↓
            Database search: MasterConfig + WhatsAppSettings
                    ↓
            If found: Process message
            If not found: Ignore message ❌
```

**Fix:** Ensure phone_number_id exists in database!

---

## 📞 Quick Reference

| Issue | Log Indicator | Fix |
|-------|---------------|-----|
| Meta not sending | No logs | Check Meta webhooks |
| Phone ID not in DB | `TOTAL USERS FOUND: 0` | Run INSERT query |
| Duplicate tokens | Wrong user receives | Update verify token |
| Wrong mapping | Fallback to user 1 | Add specific entry |

---

## ✨ After Fix

Your system should:
- ✅ Receive webhooks for both numbers
- ✅ Route messages to correct users
- ✅ Display in correct accounts
- ✅ Show proper phone number labels
- ✅ Handle both numbers independently

---

**Need the detailed guides? Check:**
- `WEBHOOK_DEBUGGING_GUIDE.md` - Detailed log analysis
- `QUICK_WEBHOOK_FIX.md` - Fast troubleshooting
- `DATABASE_DIAGNOSTIC_QUERIES.md` - SQL queries
