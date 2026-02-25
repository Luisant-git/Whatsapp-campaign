# Quick Deployment Guide - Multi-Phone Number Support

## 🚀 Quick Start (5 Minutes)

### Step 1: Run Migration (2 min)
```bash
# Connect to your PostgreSQL database
psql -U your_db_user -d your_tenant_db

# Run the migration
\i backend/prisma/migrations/add-phone-number-id-support.sql

# Verify columns added
\d "WhatsAppMessage"
\d "Contact"
```

### Step 2: Regenerate Prisma Client (1 min)
```bash
cd backend
npx prisma generate
```

### Step 3: Restart Backend (1 min)
```bash
# Stop current process
pm2 stop whatsapp-backend  # or your process manager

# Start backend
npm run start:prod

# Or with PM2
pm2 start npm --name "whatsapp-backend" -- run start:prod
```

### Step 4: Verify (1 min)
```bash
# Check logs for phoneNumberId extraction
tail -f logs/application.log | grep "Phone Number ID"

# Send test message and verify
curl -X POST http://localhost:3000/whatsapp/send-message \
  -H "Content-Type: application/json" \
  -d '{"to": "1234567890", "message": "Test"}'
```

## 📋 What Changed

### Database
- `WhatsAppMessage.phoneNumberId` - NEW column
- `Contact.phoneNumberId` - NEW column
- `Contact` unique constraint changed: `phone` → `(phone, phoneNumberId)`

### Code
- Webhook extracts `metadata.phone_number_id`
- All messages stored with `phoneNumberId`
- Contacts unique per WhatsApp number
- Replies use correct `phoneNumberId` automatically

## ✅ Verification Checklist

```bash
# 1. Check database columns exist
psql -U user -d db -c "SELECT column_name FROM information_schema.columns WHERE table_name='WhatsAppMessage' AND column_name='phoneNumberId';"

# 2. Check existing data migrated
psql -U user -d db -c "SELECT COUNT(*) FROM \"WhatsAppMessage\" WHERE \"phoneNumberId\" IS NOT NULL;"

# 3. Test webhook
curl -X POST http://localhost:3000/whatsapp/webhook/YOUR_TOKEN \
  -H "Content-Type: application/json" \
  -d @test-webhook.json

# 4. Check logs
grep "Phone Number ID" logs/*.log
```

## 🔧 Rollback (If Needed)

```sql
-- Remove columns (CAUTION: Data loss)
ALTER TABLE "WhatsAppMessage" DROP COLUMN IF EXISTS "phoneNumberId";
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "phoneNumberId";

-- Restore old unique constraint
ALTER TABLE "Contact" DROP CONSTRAINT IF EXISTS "Contact_phone_phoneNumberId_key";
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_phone_key" UNIQUE ("phone");
```

## 📊 Monitoring Queries

```sql
-- Count messages per phone number
SELECT "phoneNumberId", COUNT(*) 
FROM "WhatsAppMessage" 
GROUP BY "phoneNumberId";

-- Count contacts per phone number
SELECT "phoneNumberId", COUNT(*) 
FROM "Contact" 
GROUP BY "phoneNumberId";

-- Find conversations with multiple phone numbers
SELECT phone, COUNT(DISTINCT "phoneNumberId") as num_numbers
FROM "Contact"
GROUP BY phone
HAVING COUNT(DISTINCT "phoneNumberId") > 1;
```

## 🐛 Troubleshooting

### Issue: phoneNumberId is NULL in messages
**Solution:** Check webhook payload includes `metadata.phone_number_id`
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run start:dev
```

### Issue: Duplicate contact error
**Solution:** Ensure unique constraint is on (phone, phoneNumberId)
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'Contact';
```

### Issue: Wrong phone number used for reply
**Solution:** Verify last message has correct phoneNumberId
```sql
SELECT "from", "phoneNumberId", "createdAt" 
FROM "WhatsAppMessage" 
WHERE "from" = 'CUSTOMER_PHONE' 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

## 📞 Support Commands

```bash
# Check backend version
npm list @nestjs/core

# Verify Prisma schema
npx prisma validate

# Check database connection
npx prisma db pull

# View current settings
psql -U user -d db -c "SELECT id, name, \"phoneNumberId\" FROM \"WhatsAppSettings\";"
```

## 🎯 Testing Script

```bash
#!/bin/bash
# test-multi-phone.sh

echo "Testing Multi-Phone Number Support..."

# Test 1: Send message
echo "1. Sending test message..."
curl -X POST http://localhost:3000/whatsapp/send-message \
  -H "Content-Type: application/json" \
  -d '{"to": "1234567890", "message": "Test from Phone 1"}'

# Test 2: Check database
echo "2. Checking database..."
psql -U user -d db -c "SELECT \"phoneNumberId\", COUNT(*) FROM \"WhatsAppMessage\" GROUP BY \"phoneNumberId\";"

# Test 3: Verify webhook
echo "3. Testing webhook..."
curl -X GET "http://localhost:3000/whatsapp/webhook/YOUR_TOKEN?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345"

echo "✅ Tests complete!"
```

## 📝 Notes

- **Zero Downtime**: Migration can run while system is live
- **Backward Compatible**: Existing data continues to work
- **Performance**: Indexes added for fast lookups
- **Scalable**: Supports unlimited WhatsApp numbers

## 🔐 Security

- phoneNumberId is extracted from Meta's webhook (trusted source)
- No user input validation needed for phoneNumberId
- Existing authentication/authorization unchanged

## 📈 Performance Impact

- **Minimal**: Added indexes prevent performance degradation
- **Storage**: ~50 bytes per message (phoneNumberId column)
- **Query Speed**: Same or faster with new indexes

---

**Deployment Time**: ~5 minutes  
**Downtime Required**: None  
**Risk Level**: Low (backward compatible)  
**Rollback Time**: ~2 minutes
