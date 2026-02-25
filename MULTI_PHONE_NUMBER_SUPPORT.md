# Multi-Phone Number Support Implementation

## Overview
This implementation enables your WhatsApp backend to support **MULTIPLE WhatsApp phone numbers** using the **SAME webhook**, allowing you to manage conversations from different WhatsApp Business accounts seamlessly.

## Key Changes

### 1. Database Schema Updates

#### Modified Tables:
- **WhatsAppMessage**: Added `phoneNumberId` column to track which WhatsApp number sent/received each message
- **Contact**: Added `phoneNumberId` column and changed unique constraint from `phone` to `(phone, phoneNumberId)` to support same customer across multiple WhatsApp numbers

#### Migration File:
- Location: `backend/prisma/migrations/add-phone-number-id-support.sql`
- Run this migration on all tenant databases

### 2. Webhook Handler Updates

#### File: `src/whatsapp/whatsapp.controller.ts`
- Extracts `metadata.phone_number_id` and `metadata.display_phone_number` from every incoming webhook
- Logs phone number information for debugging
- Passes `phoneNumberId` to message processing functions

### 3. Message Storage Updates

#### File: `src/whatsapp/whatsapp.service.ts`
- All message storage operations now include `phoneNumberId`
- Methods updated:
  - `handleIncomingMessage()` - stores incoming messages with phoneNumberId
  - `sendMessage()` - stores outgoing messages with phoneNumberId
  - `sendMediaMessage()` - stores media messages with phoneNumberId
  - `sendButtonsMessage()` - stores interactive messages with phoneNumberId
  - `sendMessageDirect()` - direct send with phoneNumberId
  - `sendMediaMessageDirect()` - direct media send with phoneNumberId
  - `sendButtonsMessageDirect()` - direct buttons send with phoneNumberId
  - `processMessageForTenant()` - processes messages with correct phoneNumberId

### 4. Contact Management Updates

#### File: `src/contact/contact.service.ts`
- `create()` - validates uniqueness by (phone, phoneNumberId)
- `updateDeliveryStatus()` - upserts contacts with phoneNumberId

#### File: `src/whatsapp/campaign.service.ts`
- `runCampaign()` - creates/updates contacts with phoneNumberId during campaign execution

### 5. Conversation Uniqueness

Conversations are now unique by **(customer_phone + phone_number_id)**:
- Same customer can have separate conversations with different WhatsApp numbers
- Each conversation maintains its own message history
- Contact records are unique per WhatsApp number

## How It Works

### Incoming Message Flow:
1. Webhook receives message from Meta
2. Extract `metadata.phone_number_id` from webhook payload
3. Find tenant/settings matching the `phoneNumberId`
4. Store message with `phoneNumberId`
5. Process message using correct WhatsApp number's settings

### Outgoing Message Flow:
1. Get conversation context (includes customer phone)
2. Retrieve last message's `phoneNumberId` or use default settings
3. Send reply using the same `phoneNumberId`
4. Store outgoing message with `phoneNumberId`

### Campaign Flow:
1. Campaign uses specific WhatsApp settings (with phoneNumberId)
2. All messages sent use that campaign's phoneNumberId
3. Contacts created/updated include the phoneNumberId

## Migration Steps

### Step 1: Run Database Migration
```bash
# For each tenant database, run:
psql -U <db_user> -d <tenant_db_name> -f backend/prisma/migrations/add-phone-number-id-support.sql
```

### Step 2: Update Prisma Schema
```bash
cd backend
npx prisma generate
```

### Step 3: Restart Backend
```bash
npm run start:dev
```

### Step 4: Verify Webhook Configuration
Ensure your Meta webhook is configured to send to your backend endpoint:
- URL: `https://your-domain.com/whatsapp/webhook/YOUR_VERIFY_TOKEN`
- Subscribe to: `messages` field

## Testing

### Test Multiple Phone Numbers:
1. Configure multiple WhatsApp numbers in Settings
2. Send message from Customer A to WhatsApp Number 1
3. Send message from Customer A to WhatsApp Number 2
4. Verify two separate conversations exist
5. Reply to each conversation - verify correct phoneNumberId is used

### Test Campaigns:
1. Create campaign with specific WhatsApp settings
2. Run campaign
3. Verify all messages use correct phoneNumberId
4. Check contacts are created with correct phoneNumberId

## Backward Compatibility

✅ **Existing single-number data continues to work:**
- Migration script updates existing records with default phoneNumberId
- Null phoneNumberId is supported for legacy data
- Queries handle both null and populated phoneNumberId values

## Database Indexes

Added indexes for performance:
- `WhatsAppMessage(phoneNumberId)` - fast lookup by phone number
- `WhatsAppMessage(from, phoneNumberId)` - fast conversation lookup
- `Contact(phone, phoneNumberId)` - unique constraint and fast lookup

## API Changes

### No Breaking Changes
All existing API endpoints continue to work. The phoneNumberId is handled internally.

### New Behavior:
- Contacts are now unique by (phone, phoneNumberId) instead of just phone
- Messages include phoneNumberId in database
- Replies automatically use the correct phoneNumberId from conversation context

## Monitoring & Debugging

### Webhook Logs:
```
📞 Phone Number ID: 123456789
📞 Display Phone: +1234567890
```

### Message Storage Logs:
```
✓ Message stored successfully
```

### Conversation Lookup:
Check WhatsAppMessage table for phoneNumberId to verify correct routing.

## Production Checklist

- [ ] Run migration on all tenant databases
- [ ] Update Prisma schema and regenerate client
- [ ] Restart backend services
- [ ] Verify webhook receives metadata.phone_number_id
- [ ] Test message sending with multiple phone numbers
- [ ] Test campaigns with different WhatsApp settings
- [ ] Monitor logs for phoneNumberId in all operations
- [ ] Verify contact uniqueness by (phone, phoneNumberId)

## Support

For issues or questions:
1. Check webhook logs for phoneNumberId extraction
2. Verify database has phoneNumberId columns
3. Ensure WhatsAppSettings has correct phoneNumberId configured
4. Check message storage includes phoneNumberId

## Files Modified

1. `backend/prisma/schema-tenant.prisma` - Schema updates
2. `backend/prisma/migrations/add-phone-number-id-support.sql` - Migration script
3. `backend/src/whatsapp/whatsapp.service.ts` - Message handling with phoneNumberId
4. `backend/src/whatsapp/whatsapp.controller.ts` - Webhook metadata extraction
5. `backend/src/contact/contact.service.ts` - Contact management with phoneNumberId
6. `backend/src/whatsapp/campaign.service.ts` - Campaign execution with phoneNumberId

## Summary

Your backend now supports **multiple WhatsApp phone numbers** with:
- ✅ Unique conversations per (customer_phone + phone_number_id)
- ✅ Automatic phoneNumberId extraction from webhooks
- ✅ Correct phoneNumberId used for replies
- ✅ Campaign support for specific phone numbers
- ✅ Backward compatibility with existing data
- ✅ Production-ready implementation
