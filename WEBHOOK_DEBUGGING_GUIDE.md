# Webhook Debugging Guide - Second Number Issue

## What Was Added

Enhanced logging has been added to the webhook routes to help diagnose why the second WhatsApp number isn't receiving messages.

## Changes Made

### 1. Enhanced Webhook Controller Logging (`whatsapp.controller.ts`)

**Both webhook routes now log:**
- Full webhook body from Meta
- Phone number ID receiving the message
- Display phone number
- Message sender and type
- Verify token used (if applicable)
- Detailed user lookup process with step-by-step results

### 2. Enhanced Service Logging (`whatsapp.service.ts`)

**User lookup methods now show:**
- Which phone_number_id is being searched
- How many tenants are being checked
- Which tenants have matching WhatsApp Settings
- Which tenants have matching Master Configs
- Total users found and their IDs

## How to Test

### Step 1: Monitor Backend Logs

Start your backend and watch the console output:

```bash
cd backend
npm run start:dev
```

### Step 2: Send Message to Second Number

Send a WhatsApp message to your second number from a customer phone.

### Step 3: Analyze the Logs

Look for these log sections in order:

#### A. Webhook Received
```
=== WEBHOOK POST RECEIVED (WITH TOKEN) ===
Timestamp: 2024-01-15T10:30:00.000Z
Verify Token: your_verify_token_here
🔍 FULL WEBHOOK BODY: {
  "object": "whatsapp_business_account",
  "entry": [...]
}
```

**What to check:**
- ✅ If you see this, Meta IS sending the webhook
- ❌ If you DON'T see this, Meta is NOT sending webhooks

#### B. Message Detection
```
🔔 MESSAGE DETECTED
📞 Phone Number ID: 123456789012345
📞 Display Phone: +1234567890
👤 From: 919876543210
📝 Message Type: text
🔑 Verify Token Used: your_token
```

**What to check:**
- Note the `Phone Number ID` - this is the receiving number
- Compare this with your second number's phone_number_id in Meta Business Manager

#### C. User Lookup Process
```
🔍 USER LOOKUP PROCESS:
Step 1: Looking up by verify token: your_token
→ User ID from verify token: 1

OR

Step 2: Looking up by phone_number_id: 123456789012345
→ User IDs from phone_number_id: [1, 2]

OR

Step 3: Using fallback to first active user
→ Fallback user ID: 1
```

**What to check:**
- If Step 1 succeeds: Verify token is correctly mapped
- If Step 2 is needed: Check if the phone_number_id returns any users
- If Step 3 is needed: No specific mapping exists

#### D. Detailed Phone Number ID Search
```
🔍 SEARCHING FOR USERS WITH phone_number_id: 123456789012345
→ Found 2 active tenants to search

  ✅ Tenant 1: Found 1 WhatsApp Settings
     - Settings ID: 1, Name: Main Number, PhoneID: 111111111111111
  
  ❌ Tenant 1: No matching phone_number_id
  
  ✅ Tenant 2: Found 1 Master Configs
     - MasterConfig: Second Number, PhoneID: 123456789012345

📊 TOTAL USERS FOUND: 1
User IDs: 2
```

**What to check:**
- Does your second number's phone_number_id appear in any tenant?
- Is it in WhatsApp Settings or Master Config?
- Are any users found for that phone_number_id?

#### E. Processing Result
```
✅ PROCESSING MESSAGE for user ID: 2
```

**OR**

```
❌ NO USER FOUND - Message ignored
Phone Number ID: 123456789012345
Verify Token: your_token
```

## Common Issues and Solutions

### Issue 1: No Webhook Logs Appear

**Problem:** Meta is not sending webhooks to your server

**Solutions:**
1. Check webhook subscription in Meta Business Manager
2. Verify webhook URL is correct: `https://yourdomain.com/whatsapp/webhook/YOUR_TOKEN`
3. Test webhook with Meta's "Test" button
4. Check if server is accessible from internet (not localhost)

### Issue 2: Webhook Received but "NO USER FOUND"

**Problem:** Backend receives webhook but can't find user for that phone_number_id

**Solutions:**
1. Check the phone_number_id in the logs
2. Go to your database and verify:
   ```sql
   -- Check WhatsApp Settings
   SELECT id, name, phoneNumberId, verifyToken FROM "WhatsAppSettings";
   
   -- Check Master Config
   SELECT id, name, phoneNumberId, verifyToken FROM "MasterConfig";
   ```
3. Ensure the phone_number_id matches EXACTLY (no spaces, correct digits)
4. If using Master Config, ensure `isActive = true`

### Issue 3: Wrong User Receives Messages

**Problem:** Messages from second number go to first user's account

**Solutions:**
1. Check if both numbers share the same verify token
2. Each number should have a unique verify token
3. Update webhook URL in Meta to use correct token per number:
   - Number 1: `https://yourdomain.com/whatsapp/webhook/TOKEN_1`
   - Number 2: `https://yourdomain.com/whatsapp/webhook/TOKEN_2`

### Issue 4: Phone Number ID Not in Database

**Problem:** The phone_number_id from webhook doesn't exist in your database

**Solutions:**
1. Add the second number to Master Config:
   ```sql
   INSERT INTO "MasterConfig" (name, phoneNumberId, accessToken, verifyToken, isActive)
   VALUES ('Second Number', '123456789012345', 'your_access_token', 'unique_token_2', true);
   ```
2. Or add to WhatsApp Settings for a specific user
3. Restart backend after database changes

## Testing Checklist

- [ ] Send message to first number → Check logs
- [ ] Send message to second number → Check logs
- [ ] Compare phone_number_id in both logs
- [ ] Verify both phone_number_ids exist in database
- [ ] Verify each has unique verify token
- [ ] Check webhook subscriptions in Meta Business Manager
- [ ] Confirm both numbers are active in Meta

## Quick Diagnostic Commands

### Check Database for Phone Number IDs
```sql
-- See all configured numbers
SELECT 'WhatsAppSettings' as source, id, name, phoneNumberId, verifyToken 
FROM "WhatsAppSettings"
UNION ALL
SELECT 'MasterConfig' as source, id, name, phoneNumberId, verifyToken 
FROM "MasterConfig" 
WHERE isActive = true;
```

### Test Webhook Manually
```bash
curl -X POST https://yourdomain.com/whatsapp/webhook/YOUR_TOKEN \
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
            "id": "test123",
            "type": "text",
            "text": { "body": "test" }
          }]
        }
      }]
    }]
  }'
```

## Next Steps

1. **Send a test message** to your second number
2. **Copy the full log output** from your backend console
3. **Look for the sections** described above
4. **Identify which step fails** (webhook not received, user not found, etc.)
5. **Apply the corresponding solution** from this guide

## Need More Help?

If logs show:
- ✅ Webhook received
- ✅ Correct phone_number_id detected
- ❌ But NO USER FOUND

Then the issue is: **Second number's phone_number_id is not in your database**

Solution: Add it to MasterConfig or WhatsAppSettings table with a unique verify token.
