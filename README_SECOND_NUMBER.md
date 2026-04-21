# Second WhatsApp Number - Troubleshooting Documentation

## 📖 Overview

This documentation helps diagnose and fix issues with receiving messages on a second WhatsApp number. Enhanced logging has been added to the backend to make troubleshooting easier.

## 🎯 Quick Problem Summary

**What Works:** Sending messages from second number ✅  
**What Doesn't Work:** Receiving messages to second number ❌

**Why:** Backend receives webhook but can't find which user owns that phone_number_id.

## 📚 Documentation Files

### 1. 🚀 [QUICK_WEBHOOK_FIX.md](./QUICK_WEBHOOK_FIX.md)
**Start here for fast troubleshooting**

- 3-step immediate checks
- Most common issue and fix
- Quick reference card
- Test commands

**Use when:** You need to fix it NOW

---

### 2. 📊 [VISUAL_FLOW_DIAGRAM.md](./VISUAL_FLOW_DIAGRAM.md)
**Visual guide to understand the problem**

- Flow diagrams showing current vs fixed state
- Database structure visualization
- Decision trees
- Common mistakes illustrated

**Use when:** You want to understand HOW it works

---

### 3. 🔍 [WEBHOOK_DEBUGGING_GUIDE.md](./WEBHOOK_DEBUGGING_GUIDE.md)
**Comprehensive debugging guide**

- Detailed log analysis
- What each log section means
- Common issues and solutions
- Testing checklist
- Diagnostic commands

**Use when:** You need detailed explanation of logs

---

### 4. 💾 [DATABASE_DIAGNOSTIC_QUERIES.md](./DATABASE_DIAGNOSTIC_QUERIES.md)
**SQL queries for database inspection**

- Check all phone numbers
- Find duplicates
- Add second number
- Verify configuration
- Backup and export

**Use when:** You need to inspect/fix database

---

### 5. 📋 [SECOND_NUMBER_COMPLETE_GUIDE.md](./SECOND_NUMBER_COMPLETE_GUIDE.md)
**Master guide with everything**

- Complete troubleshooting process
- Step-by-step fix instructions
- All common issues
- Verification checklist
- Success indicators

**Use when:** You want the complete picture

---

## 🚀 Quick Start (3 Minutes)

### Step 1: Send Test Message
Send a WhatsApp message from your phone to the second number.

### Step 2: Check Backend Logs
Look for:
```
📞 Phone Number ID: 123456789012345
```
Copy this number.

### Step 3: Check Database
```sql
SELECT * FROM "MasterConfig" WHERE "phoneNumberId" = '123456789012345';
```

**If NO results found:**
```sql
INSERT INTO "MasterConfig" 
  (name, "phoneNumberId", "accessToken", "verifyToken", "isActive")
VALUES 
  ('Second Number', '123456789012345', 'YOUR_ACCESS_TOKEN', 'unique_token_2', true);
```

Then:
1. Update webhook URL in Meta Business Manager
2. Restart backend
3. Test again

**Done!** ✅

---

## 🔧 What Was Changed in Code

### Files Modified

#### 1. `backend/src/whatsapp/whatsapp.controller.ts`
**Added enhanced logging to webhook routes:**
- Full webhook payload logging
- Phone number ID detection
- Step-by-step user lookup process
- Clear success/failure indicators

#### 2. `backend/src/whatsapp/whatsapp.service.ts`
**Added detailed logging to user lookup methods:**
- Phone number ID search logging
- Tenant-by-tenant search results
- MasterConfig and WhatsAppSettings checks
- Total users found summary

### New Log Output Examples

**Webhook Received:**
```
=== WEBHOOK POST RECEIVED (WITH TOKEN) ===
Timestamp: 2024-01-15T10:30:00.000Z
Verify Token: your_verify_token
🔍 FULL WEBHOOK BODY: {...}
```

**Message Detection:**
```
🔔 MESSAGE DETECTED
📞 Phone Number ID: 123456789012345
📞 Display Phone: +1234567890
👤 From: 919876543210
📝 Message Type: text
```

**User Lookup:**
```
🔍 USER LOOKUP PROCESS:
Step 1: Looking up by verify token: your_token
→ User ID from verify token: NOT FOUND

Step 2: Looking up by phone_number_id: 123456789012345
→ User IDs from phone_number_id: NOT FOUND

📊 TOTAL USERS FOUND: 0
❌ NO USER FOUND - Message ignored
```

---

## 📋 Recommended Reading Order

### For Quick Fix:
1. Read [QUICK_WEBHOOK_FIX.md](./QUICK_WEBHOOK_FIX.md)
2. Follow the 3 steps
3. Test and verify

### For Understanding:
1. Read [VISUAL_FLOW_DIAGRAM.md](./VISUAL_FLOW_DIAGRAM.md)
2. Understand the flow
3. Read [WEBHOOK_DEBUGGING_GUIDE.md](./WEBHOOK_DEBUGGING_GUIDE.md)

### For Database Work:
1. Read [DATABASE_DIAGNOSTIC_QUERIES.md](./DATABASE_DIAGNOSTIC_QUERIES.md)
2. Run diagnostic queries
3. Apply fixes

### For Complete Solution:
1. Read [SECOND_NUMBER_COMPLETE_GUIDE.md](./SECOND_NUMBER_COMPLETE_GUIDE.md)
2. Follow step-by-step process
3. Use verification checklist

---

## 🎯 Most Common Issue (90% of cases)

**Problem:** Second number's phone_number_id not in database

**Symptoms:**
```
❌ NO USER FOUND - Message ignored
📊 TOTAL USERS FOUND: 0
```

**Fix:**
```sql
-- Get phone_number_id from logs, then:
INSERT INTO "MasterConfig" 
  (name, "phoneNumberId", "accessToken", "verifyToken", "isActive")
VALUES 
  ('Second Number', 'YOUR_PHONE_NUMBER_ID', 'YOUR_ACCESS_TOKEN', 'unique_token_2', true);
```

Then update webhook URL in Meta and restart backend.

---

## 🧪 Testing Your Fix

### 1. Start Backend
```bash
cd backend
npm run start:dev
```

### 2. Send Test Message
Send "test" from your phone to the second WhatsApp number.

### 3. Check Logs
Should see:
```
✅ PROCESSING MESSAGE for user ID: X
```

### 4. Verify Database
```sql
SELECT * FROM "WhatsAppMessage" 
WHERE "phoneNumberId" = 'YOUR_PHONE_NUMBER_ID'
ORDER BY "createdAt" DESC 
LIMIT 5;
```

### 5. Check Frontend
Message should appear in the correct user's chat list.

---

## ✅ Success Checklist

After fix, verify:

- [ ] Backend logs show "WEBHOOK POST RECEIVED"
- [ ] Backend logs show correct phone_number_id
- [ ] Backend logs show "PROCESSING MESSAGE for user ID: X"
- [ ] Database has entry in MasterConfig for second number
- [ ] Database has incoming messages with correct phone_number_id
- [ ] Frontend displays messages in correct account
- [ ] Both numbers work independently

---

## 🆘 Need Help?

### If Webhook Not Received:
→ See [WEBHOOK_DEBUGGING_GUIDE.md](./WEBHOOK_DEBUGGING_GUIDE.md) - Issue 1

### If Phone Number ID Not Found:
→ See [DATABASE_DIAGNOSTIC_QUERIES.md](./DATABASE_DIAGNOSTIC_QUERIES.md) - Add Second Number

### If Wrong User Receives Messages:
→ See [QUICK_WEBHOOK_FIX.md](./QUICK_WEBHOOK_FIX.md) - Check 3

### If Still Not Working:
→ See [SECOND_NUMBER_COMPLETE_GUIDE.md](./SECOND_NUMBER_COMPLETE_GUIDE.md) - Complete Process

---

## 📊 Diagnostic Tools

### Check Backend Logs
```bash
cd backend
npm run start:dev
# Watch console output when sending test message
```

### Check Database
```sql
-- See all configured numbers
SELECT name, "phoneNumberId", "verifyToken" 
FROM "MasterConfig" 
WHERE "isActive" = true;
```

### Test Webhook Manually
```bash
curl -X POST https://yourdomain.com/whatsapp/webhook/YOUR_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{"metadata":{"phone_number_id":"123456789012345"},"messages":[{"from":"919876543210","id":"test123","type":"text","text":{"body":"test"}}]}}]}]}'
```

---

## 🔑 Key Concepts

### Phone Number ID
- Unique identifier for each WhatsApp number
- Found in Meta Business Manager
- Must be stored in database
- Used to route incoming messages

### Verify Token
- Unique string for webhook verification
- Must be unique per number
- Used in webhook URL
- Matches database entry

### Webhook URL Format
```
https://yourdomain.com/whatsapp/webhook/{verifyToken}
```

### Database Lookup Flow
```
Webhook → Extract phone_number_id → Search Database → Find User → Process Message
```

---

## 📝 Summary

**The Problem:**
Backend receives webhook but can't find user for that phone_number_id.

**The Solution:**
Add second number's phone_number_id to database with unique verify token.

**The Verification:**
Backend logs show "PROCESSING MESSAGE" and messages appear in frontend.

**The Documentation:**
5 comprehensive guides to help you fix and understand the issue.

---

## 🎓 Additional Resources

### Meta Documentation
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Webhooks Setup](https://developers.facebook.com/docs/graph-api/webhooks)

### Your Backend Code
- Webhook Controller: `backend/src/whatsapp/whatsapp.controller.ts`
- WhatsApp Service: `backend/src/whatsapp/whatsapp.service.ts`

### Database Schema
- MasterConfig table: Stores phone number configurations
- WhatsAppSettings table: Alternative storage for phone numbers
- WhatsAppMessage table: Stores all messages

---

## 🚀 Next Steps

1. **Read** [QUICK_WEBHOOK_FIX.md](./QUICK_WEBHOOK_FIX.md) for immediate fix
2. **Test** by sending message to second number
3. **Check** backend logs for diagnostic information
4. **Verify** message appears in correct account
5. **Celebrate** when both numbers work! 🎉

---

**Last Updated:** January 2024  
**Version:** 1.0  
**Status:** Enhanced logging added, ready for troubleshooting
