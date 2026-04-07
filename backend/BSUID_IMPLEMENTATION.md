# Business-Scoped User ID (BSUID) Implementation Guide

## Overview
This implementation adds support for WhatsApp's Business-Scoped User IDs (BSUIDs), which are unique identifiers for WhatsApp users that enable messaging when usernames are adopted and phone numbers are not available.

## What Changed

### 1. Database Schema Updates
**File**: `prisma/schema-tenant.prisma`

Added BSUID fields to:
- `WhatsAppMessage` model:
  - `userId` (String?) - Business-scoped user ID
  - `parentUserId` (String?) - Parent BSUID for linked portfolios
  - `username` (String?) - WhatsApp username if enabled

- `Contact` model:
  - `userId` (String?) - Business-scoped user ID
  - `parentUserId` (String?) - Parent BSUID for linked portfolios
  - `username` (String?) - WhatsApp username if enabled

**Migration**: `prisma/migrations/add-bsuid-support.sql`

### 2. BSUID Service
**File**: `src/whatsapp/bsuid.service.ts`

Utility service for BSUID operations:
- Extract BSUID from webhook data
- Validate BSUID format
- Determine identifier type (phone/BSUID/parent BSUID)
- Build message payloads with BSUID support

### 3. Webhook Processing
**File**: `src/whatsapp/whatsapp.controller.ts`

Updated webhook handlers to:
- Extract BSUID data from incoming webhooks
- Pass BSUID information to message processing

### 4. Message Processing
**File**: `src/whatsapp/whatsapp.service.ts`

Updated methods:
- `handleIncomingMessageWithoutContext()` - Accept BSUID parameters
- `processMessageForTenant()` - Store BSUID data in messages
- `upsertContactFromIncomingMessage()` - Store BSUID data in contacts
- `sendMessageDirect()` - Support sending to BSUID
- `sendMediaMessageDirect()` - Support sending media to BSUID

### 5. Notification Service
**File**: `src/notifications/owner-notification.service.ts`

Updated to support sending notifications to BSUID identifiers.

## BSUID Format

### Regular BSUID
Format: `{COUNTRY_CODE}.{ALPHANUMERIC_ID}`
Example: `US.13491208655302741918`

### Parent BSUID (Linked Portfolios)
Format: `{COUNTRY_CODE}.ENT.{ALPHANUMERIC_ID}`
Example: `US.ENT.11815799212886844830`

## How It Works

### Incoming Messages
1. Webhook receives message with BSUID data:
```json
{
  "contacts": [{
    "user_id": "US.13491208655302741918",
    "parent_user_id": "US.ENT.11815799212886844830",
    "profile": {
      "name": "John Doe",
      "username": "@johndoe"
    },
    "wa_id": "16505551234"
  }]
}
```

2. System extracts and stores:
   - `userId` - For messaging this specific user
   - `parentUserId` - For cross-portfolio messaging (if enabled)
   - `username` - User's WhatsApp username
   - `wa_id` - Phone number (if available)

### Sending Messages
The system automatically detects if recipient is BSUID or phone number:

**To Phone Number:**
```json
{
  "messaging_product": "whatsapp",
  "to": "16505551234",
  "type": "text",
  "text": { "body": "Hello" }
}
```

**To BSUID:**
```json
{
  "messaging_product": "whatsapp",
  "recipient": "US.13491208655302741918",
  "type": "text",
  "text": { "body": "Hello" }
}
```

## Phone Number Availability

Phone numbers are included in webhooks when:
1. You messaged/called the user within last 30 days
2. You received message/call from user within last 30 days
3. User is in your contact book

Otherwise, only BSUID is provided.

## Migration Steps

### 1. Run Database Migration
```bash
# Apply the migration
npx prisma migrate dev --name add-bsuid-support

# Or run the SQL directly
psql -d your_database -f prisma/migrations/add-bsuid-support.sql
```

### 2. Regenerate Prisma Client
```bash
npx prisma generate
```

### 3. Restart Application
```bash
npm run start:dev
```

## Testing

### Test BSUID Detection
```typescript
import { BsuidService } from './bsuid.service';

const bsuidService = new BsuidService();

// Test regular BSUID
console.log(bsuidService.isBSUID('US.13491208655302741918')); // true

// Test parent BSUID
console.log(bsuidService.isParentBSUID('US.ENT.11815799212886844830')); // true

// Test phone number
console.log(bsuidService.isBSUID('16505551234')); // false
```

### Test Message Sending
```typescript
// Send to phone number
await whatsappService.sendMessageDirect(
  '16505551234',
  'Hello',
  accessToken,
  phoneNumberId,
  tenantClient
);

// Send to BSUID
await whatsappService.sendMessageDirect(
  'US.13491208655302741918',
  'Hello',
  accessToken,
  phoneNumberId,
  tenantClient
);
```

## Important Notes

1. **Backward Compatibility**: All BSUID fields are optional, existing functionality continues to work with phone numbers only.

2. **Contact Book**: The system automatically stores BSUID data when receiving messages, enabling future communication even if phone number becomes unavailable.

3. **Parent BSUIDs**: Only available if your business has linked portfolios. Contact Meta to enable this feature.

4. **Username Privacy**: When users enable usernames, their phone numbers may not be included in webhooks. Always store and use BSUIDs as the primary identifier.

5. **API Version**: This implementation uses WhatsApp Cloud API v18.0. BSUIDs are supported from early 2026.

## Troubleshooting

### BSUID Not Stored
- Check webhook payload includes `user_id` field
- Verify database migration completed successfully
- Check application logs for errors

### Messages Not Sending to BSUID
- Verify BSUID format is correct (includes country code and period)
- Ensure you're using the correct API version (v18.0+)
- Check that BSUID is scoped to your business portfolio

### Phone Number Missing
- This is expected behavior when user enables username feature
- Use stored BSUID from contact record
- Implement phone number request button if needed

## Future Enhancements

1. **Username Management API**: Add endpoints to manage business usernames
2. **Contact Book API**: Expose contact book management endpoints
3. **BSUID Analytics**: Track BSUID adoption rates
4. **Phone Number Request**: Implement REQUEST_CONTACT_INFO button type

## References

- [WhatsApp BSUID Documentation](https://developers.facebook.com/docs/whatsapp/business-scoped-user-ids)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
