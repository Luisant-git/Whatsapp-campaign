# BSUID Testing Guide - Step by Step

## Prerequisites
- Backend server running on http://localhost:3010
- Database connection working
- WhatsApp Business API credentials configured

---

## Step 1: Run Database Migration

```bash
cd d:\Whatsapp\backend

# Apply the migration
npx prisma migrate dev --name add-bsuid-support

# Regenerate Prisma Client
npx prisma generate
```

**Expected Output:**
```
✓ Migration applied successfully
✓ Prisma Client generated
```

---

## Step 2: Restart Your Backend

```bash
# Stop your backend (Ctrl+C)
# Then restart
npm run start:dev
```

**Check logs for:**
```
✓ Server started on port 3010
✓ Database connected
```

---

## Step 3: Verify Database Schema

```bash
node test-bsuid-setup.js
```

**Expected Output:**
```
🔍 Testing BSUID Implementation...

1️⃣ Checking database schema...
✅ BSUID columns exist in WhatsAppMessage table
   - userId: character varying
   - parentUserId: character varying
   - username: character varying

2️⃣ Checking Contact table...
✅ BSUID columns exist in Contact table
   - userId: character varying
   - parentUserId: character varying
   - username: character varying

3️⃣ Checking indexes...
✅ BSUID indexes created
   - WhatsAppMessage_userId_idx
   - WhatsAppMessage_parentUserId_idx

✅ BSUID setup verification complete!
```

**If you see errors:**
- ❌ Columns missing → Run migration again
- ❌ Connection error → Check database credentials

---

## Step 4: Test Webhook Processing (Simulated)

```bash
node test-bsuid-webhook.js
```

**Expected Output:**
```
🚀 Starting BSUID Webhook Tests

Backend URL: http://localhost:3010
Make sure your backend is running!

🧪 Testing: Message with BSUID (no phone)
📤 Sending webhook...
✅ Webhook accepted: EVENT_RECEIVED

🧪 Testing: Message with both BSUID and phone
📤 Sending webhook...
✅ Webhook accepted: EVENT_RECEIVED

🧪 Testing: Status update with BSUID
📤 Sending webhook...
✅ Webhook accepted: EVENT_RECEIVED

🔍 Verifying database records...
✅ Found 3 messages with BSUID:

   Message ID: 123
   From: N/A
   User ID (BSUID): US.13491208655302741918
   Parent User ID: US.ENT.11815799212886844830
   Username: @johndoe
   Message: Hello, testing BSUID!...

✅ Found 2 contacts with BSUID:

   Contact: John Doe
   Phone: N/A
   User ID (BSUID): US.13491208655302741918
   Parent User ID: US.ENT.11815799212886844830
   Username: @johndoe

✅ All tests completed!
```

---

## Step 5: Test BSUID Detection & Sending

```bash
# First, update credentials in test-bsuid-send.js
# Edit the file and replace:
# - YOUR_ACCESS_TOKEN with your actual token
# - YOUR_PHONE_NUMBER_ID with your phone number ID

node test-bsuid-send.js
```

**Expected Output:**
```
🚀 Starting BSUID Send Message Tests

🔍 Testing BSUID Detection Logic

✅ US.13491208655302741918
   Expected: bsuid, Got: bsuid

✅ US.ENT.11815799212886844830
   Expected: parent_bsuid, Got: parent_bsuid

✅ 16505551234
   Expected: phone, Got: phone

🔍 Checking database for BSUID records...

✅ Found contact with BSUID:
   Name: John Doe
   Phone: N/A
   BSUID: US.13491208655302741918
   Parent BSUID: US.ENT.11815799212886844830
   Username: @johndoe

📤 Testing message sending...

🧪 Testing: Send message to Database BSUID
📤 Recipient: US.13491208655302741918
✅ Message sent successfully!
   Message ID: wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQTRBNjU5OUFFRTAzODEwMTQ0RgA=

✅ All tests completed!
```

---

## Step 6: Test with Real WhatsApp Webhook

### Option A: Using WhatsApp Test Button
1. Go to Meta App Dashboard
2. Navigate to WhatsApp > Configuration
3. Click "Test" button next to webhook URL
4. Check your backend logs

### Option B: Send Real Message
1. Send a message from WhatsApp to your business number
2. Check backend logs for BSUID data

**Backend logs should show:**
```
📨 Incoming message type: text
BSUID Data: {
  userId: 'US.13491208655302741918',
  parentUserId: 'US.ENT.11815799212886844830',
  username: '@johndoe'
}
Processing message for phone number ID: 106540352242922
✓ Message stored successfully
```

---

## Step 7: Verify in Database Directly

```bash
# Connect to your database
psql -U your_user -d your_database

# Check WhatsAppMessage table
SELECT id, "from", "userId", "parentUserId", username, message 
FROM "WhatsAppMessage" 
WHERE "userId" IS NOT NULL 
ORDER BY "createdAt" DESC 
LIMIT 5;

# Check Contact table
SELECT id, name, phone, "userId", "parentUserId", username 
FROM "Contact" 
WHERE "userId" IS NOT NULL 
LIMIT 5;
```

**Expected Result:**
```
 id  |      from       |         userId          |      parentUserId       | username  |     message
-----+-----------------+-------------------------+-------------------------+-----------+------------------
 123 | N/A             | US.13491208655302741918 | US.ENT.11815799212886844830 | @johndoe | Hello, testing!
```

---

## Step 8: Test Frontend Display

1. Open your frontend: http://localhost:5173 (or your frontend URL)
2. Go to WhatsApp Chat page
3. Look for the test messages

**What to check:**
- ✅ Messages appear in chat list
- ✅ Contact name shows (or username if no name)
- ✅ Messages are readable
- ✅ You can send replies

---

## Troubleshooting

### ❌ Migration Failed
```bash
# Check Prisma schema
npx prisma validate

# Force reset (WARNING: deletes data)
npx prisma migrate reset

# Then run migration again
npx prisma migrate dev --name add-bsuid-support
```

### ❌ Webhook Not Receiving BSUID
**Check:**
1. WhatsApp API version (should be v18.0+)
2. Webhook subscription includes "messages" field
3. Backend logs show incoming webhook data

### ❌ Database Columns Not Found
```bash
# Manually run SQL migration
psql -U your_user -d your_database -f prisma/migrations/add-bsuid-support.sql

# Then regenerate Prisma Client
npx prisma generate
```

### ❌ Messages Not Storing BSUID
**Check backend logs for:**
```
userId: undefined
parentUserId: undefined
```

**Solution:** Webhook might not include BSUID yet (feature rolling out in 2026)

---

## Quick Verification Checklist

- [ ] Database migration completed
- [ ] Prisma Client regenerated
- [ ] Backend restarted
- [ ] Database columns exist (userId, parentUserId, username)
- [ ] Test webhook accepted
- [ ] BSUID data stored in database
- [ ] BSUID detection logic works
- [ ] Messages can be sent to BSUID
- [ ] Frontend displays messages correctly

---

## Expected Timeline

**Now (Testing Phase):**
- ✅ Database schema ready
- ✅ Backend code ready
- ✅ Can process simulated BSUID webhooks
- ⚠️  Real BSUID data not available yet (WhatsApp feature pending)

**April 2026:**
- ✅ Real BSUID data in webhooks
- ✅ Can store real user BSUIDs

**May 2026:**
- ✅ Can send messages to BSUID
- ✅ Full BSUID support active

---

## Success Indicators

### ✅ Implementation Working:
1. Database has BSUID columns
2. Test webhooks process successfully
3. BSUID detection logic works
4. No errors in backend logs
5. Frontend displays messages normally

### ⚠️  Waiting for WhatsApp:
- Real BSUID data in production webhooks
- Ability to send to real BSUIDs
- Username feature enabled for users

---

## Need Help?

**Check logs:**
```bash
# Backend logs
tail -f logs/application.log

# Database logs
tail -f /var/log/postgresql/postgresql.log
```

**Common Issues:**
1. **"Column does not exist"** → Run migration
2. **"Cannot read property userId"** → Check webhook payload structure
3. **"Message sending failed"** → BSUID feature not available yet (expected)

---

## Next Steps After Verification

1. ✅ Monitor backend logs for real BSUID data (when available)
2. ✅ Test with real WhatsApp messages
3. ✅ Update documentation for your team
4. ✅ Plan for username adoption by users
5. ✅ Consider implementing phone number request button

---

**Your implementation is ready! The system will automatically start using BSUIDs when WhatsApp enables the feature in 2026.**
