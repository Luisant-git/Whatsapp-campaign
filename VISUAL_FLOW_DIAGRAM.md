# Visual Flow Diagram - Second Number Issue

## Current State (Not Working)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SENDING MESSAGES (✅ WORKS)                   │
└─────────────────────────────────────────────────────────────────┘

Frontend
   │
   │ User clicks "Send"
   │ Specifies: phone_number_id = "123456789012345"
   ↓
Backend
   │
   │ Uses specified phone_number_id
   ↓
Meta WhatsApp API
   │
   │ Sends from number: 123456789012345
   ↓
Customer receives message ✅


┌─────────────────────────────────────────────────────────────────┐
│                  RECEIVING MESSAGES (❌ BROKEN)                  │
└─────────────────────────────────────────────────────────────────┘

Customer sends message
   │
   │ To: Second WhatsApp Number
   ↓
Meta WhatsApp API
   │
   │ Webhook payload includes:
   │ phone_number_id: "123456789012345"
   ↓
Backend Webhook Route
   │
   │ Receives webhook ✅
   │ Extracts phone_number_id: "123456789012345"
   ↓
User Lookup Process
   │
   ├─ Step 1: Search by verify_token
   │  └─ Result: NOT FOUND (or finds wrong user)
   │
   ├─ Step 2: Search by phone_number_id
   │  │
   │  ├─ Check MasterConfig table
   │  │  └─ WHERE phoneNumberId = "123456789012345"
   │  │     └─ Result: NOT FOUND ❌
   │  │
   │  └─ Check WhatsAppSettings table
   │     └─ WHERE phoneNumberId = "123456789012345"
   │        └─ Result: NOT FOUND ❌
   │
   └─ Step 3: Fallback to first active user
      └─ Result: Uses wrong user (or no user)
   
   ↓
❌ Message ignored or goes to wrong account
```

## After Fix (Working)

```
┌─────────────────────────────────────────────────────────────────┐
│                  RECEIVING MESSAGES (✅ FIXED)                   │
└─────────────────────────────────────────────────────────────────┘

Customer sends message
   │
   │ To: Second WhatsApp Number
   ↓
Meta WhatsApp API
   │
   │ Webhook payload includes:
   │ phone_number_id: "123456789012345"
   ↓
Backend Webhook Route
   │
   │ Receives webhook ✅
   │ Extracts phone_number_id: "123456789012345"
   ↓
User Lookup Process
   │
   ├─ Step 1: Search by verify_token
   │  └─ Result: FOUND ✅ (if using unique token per number)
   │
   OR
   │
   ├─ Step 2: Search by phone_number_id
   │  │
   │  ├─ Check MasterConfig table
   │  │  └─ WHERE phoneNumberId = "123456789012345"
   │  │     └─ Result: FOUND ✅
   │  │        ├─ name: "Second WhatsApp Number"
   │  │        ├─ phoneNumberId: "123456789012345"
   │  │        ├─ verifyToken: "unique_token_2"
   │  │        └─ isActive: true
   │  │
   │  └─ Returns: User ID = 2
   │
   ↓
✅ Message processed for correct user
   │
   ├─ Stored in database
   ├─ Appears in frontend
   └─ Correct account receives it
```

## Database Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        MasterConfig Table                        │
├────┬──────────────────────┬─────────────────┬──────────────────┤
│ id │ name                 │ phoneNumberId   │ verifyToken      │
├────┼──────────────────────┼─────────────────┼──────────────────┤
│ 1  │ First Number         │ 111111111111111 │ first_token      │
│ 2  │ Second Number ⭐     │ 123456789012345 │ second_token ⭐  │
└────┴──────────────────────┴─────────────────┴──────────────────┘
                                    ↑                    ↑
                                    │                    │
                    This must match Meta    This must be unique
                    Business Manager        and match webhook URL
```

## Webhook URL Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│              Meta Business Manager - Webhooks                    │
└─────────────────────────────────────────────────────────────────┘

First Number:
  Webhook URL: https://yourdomain.com/whatsapp/webhook/first_token
                                                         ↑
                                                         │
                                    Must match MasterConfig.verifyToken

Second Number:
  Webhook URL: https://yourdomain.com/whatsapp/webhook/second_token
                                                         ↑
                                                         │
                                    Must match MasterConfig.verifyToken
```

## Log Flow (Enhanced Logging)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Console Output                        │
└─────────────────────────────────────────────────────────────────┘

When message arrives:

1. === WEBHOOK POST RECEIVED ===
   ↓
   Shows: Full webhook payload from Meta

2. 🔔 MESSAGE DETECTED
   ↓
   Shows: Phone Number ID: 123456789012345
          Display Phone: +1234567890
          From: 919876543210

3. 🔍 USER LOOKUP PROCESS
   ↓
   Shows: Step 1: Looking up by verify token
          Step 2: Looking up by phone_number_id
          Step 3: Fallback to first active user

4. 🔍 SEARCHING FOR USERS WITH phone_number_id
   ↓
   Shows: Which tenants checked
          Which tables searched
          What was found

5. 📊 TOTAL USERS FOUND: X
   ↓
   Shows: How many users own this phone_number_id

6. ✅ PROCESSING MESSAGE for user ID: X
   OR
   ❌ NO USER FOUND - Message ignored
```

## Decision Tree

```
                    Message Received
                          │
                          ↓
              ┌───────────────────────┐
              │ Extract phone_number_id│
              └───────────────────────┘
                          │
                          ↓
              ┌───────────────────────┐
              │ Search in Database    │
              └───────────────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ↓                   ↓
           ✅ FOUND            ❌ NOT FOUND
                │                   │
                ↓                   ↓
        Process Message      Ignore Message
                │                   │
                ↓                   ↓
        Store in Database    Log Error
                │                   │
                ↓                   ↓
        Show in Frontend     No Action
```

## The Fix in 3 Steps

```
┌─────────────────────────────────────────────────────────────────┐
│                         STEP 1: ADD TO DATABASE                  │
└─────────────────────────────────────────────────────────────────┘

INSERT INTO "MasterConfig" (
  name, phoneNumberId, accessToken, verifyToken, isActive
) VALUES (
  'Second Number',
  '123456789012345',      ← From Meta Business Manager
  'EAAG...token',         ← From Meta Business Manager
  'unique_token_2',       ← Create unique string
  true
);


┌─────────────────────────────────────────────────────────────────┐
│                    STEP 2: UPDATE META WEBHOOK                   │
└─────────────────────────────────────────────────────────────────┘

Go to Meta Business Manager
  → WhatsApp
  → Configuration
  → Webhooks
  → Edit

Change URL to:
https://yourdomain.com/whatsapp/webhook/unique_token_2
                                         ↑
                                         │
                        Must match database verifyToken


┌─────────────────────────────────────────────────────────────────┐
│                      STEP 3: RESTART & TEST                      │
└─────────────────────────────────────────────────────────────────┘

1. Restart backend server
2. Send test message to second number
3. Check logs for:
   ✅ PROCESSING MESSAGE for user ID: X
4. Verify message appears in frontend
```

## Comparison: First vs Second Number

```
┌─────────────────────────────────────────────────────────────────┐
│                         FIRST NUMBER (✅ Works)                  │
└─────────────────────────────────────────────────────────────────┘

Database:
  ✅ phoneNumberId: 111111111111111
  ✅ verifyToken: first_token
  ✅ isActive: true

Meta Webhook:
  ✅ URL: https://yourdomain.com/whatsapp/webhook/first_token
  ✅ Subscribed to: messages

Result:
  ✅ Webhook received
  ✅ User found
  ✅ Message processed


┌─────────────────────────────────────────────────────────────────┐
│                      SECOND NUMBER (❌ Broken)                   │
└─────────────────────────────────────────────────────────────────┘

Database:
  ❌ phoneNumberId: NOT IN DATABASE
  ❌ verifyToken: NOT IN DATABASE
  ❌ isActive: N/A

Meta Webhook:
  ⚠️  URL: https://yourdomain.com/whatsapp/webhook/first_token
      (Using same token as first number)
  ✅ Subscribed to: messages

Result:
  ✅ Webhook received
  ❌ User not found (or wrong user)
  ❌ Message ignored/misrouted
```

## Success Criteria

```
After Fix, You Should See:

Backend Logs:
  ✅ === WEBHOOK POST RECEIVED ===
  ✅ 📞 Phone Number ID: 123456789012345
  ✅ 🔍 SEARCHING FOR USERS WITH phone_number_id: 123456789012345
  ✅ ✅ Tenant X: Found 1 Master Configs
  ✅ 📊 TOTAL USERS FOUND: 1
  ✅ ✅ PROCESSING MESSAGE for user ID: 2

Database:
  ✅ SELECT * FROM "MasterConfig" 
     WHERE "phoneNumberId" = '123456789012345'
     → Returns 1 row

  ✅ SELECT * FROM "WhatsAppMessage" 
     WHERE "phoneNumberId" = '123456789012345'
     → Returns incoming messages

Frontend:
  ✅ Message appears in chat list
  ✅ Correct phone number label shown
  ✅ Message content visible
  ✅ Timestamp correct
```

## Common Mistakes to Avoid

```
❌ MISTAKE 1: Using Same Verify Token
   First Number:  webhook/same_token
   Second Number: webhook/same_token
   
   Result: Both numbers route to same user

✅ CORRECT:
   First Number:  webhook/first_token
   Second Number: webhook/second_token


❌ MISTAKE 2: Wrong Phone Number ID
   Database: phoneNumberId = "111111111111111"
   Meta:     phoneNumberId = "123456789012345"
   
   Result: User not found

✅ CORRECT:
   Database: phoneNumberId = "123456789012345"
   Meta:     phoneNumberId = "123456789012345"


❌ MISTAKE 3: Not Updating Webhook URL
   Database: verifyToken = "new_token"
   Meta:     webhook/old_token
   
   Result: Token validation fails

✅ CORRECT:
   Database: verifyToken = "new_token"
   Meta:     webhook/new_token


❌ MISTAKE 4: Forgetting to Restart
   Database: Updated ✅
   Meta:     Updated ✅
   Backend:  Still running old code
   
   Result: Changes not applied

✅ CORRECT:
   Database: Updated ✅
   Meta:     Updated ✅
   Backend:  Restarted ✅
```

## Quick Diagnostic Flowchart

```
Send message to second number
         │
         ↓
    Check logs
         │
    ┌────┴────┐
    │         │
    ↓         ↓
No logs    Logs appear
    │         │
    ↓         ↓
Meta not   Check for:
sending    "NO USER FOUND"
webhooks       │
    │     ┌────┴────┐
    │     │         │
    │     ↓         ↓
    │   Found    Not Found
    │     │         │
    │     ↓         ↓
    │  Working   Add to
    │            Database
    │              │
    └──────────────┴──────→ Fix & Test Again
```

---

**Remember:** The key is ensuring the phone_number_id from Meta's webhook exists in your database with a unique verify token!
