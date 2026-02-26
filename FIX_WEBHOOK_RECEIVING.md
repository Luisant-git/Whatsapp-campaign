# Fix Webhook Not Receiving Messages

## Problem
- **Webhook-1 (803957376127788)**: ✅ Sends and receives messages
- **Webhook-2 (916429964876580)**: ❌ Only sends messages, doesn't receive

## Root Cause
The phone number 916429964876580 is likely configured as **"campaigns-only"** in the `FeatureAssignment` table. This configuration blocks incoming messages from customers.

## How It Works
The system uses a phone routing feature that determines how each phone number handles messages:

```typescript
// In whatsapp.service.ts - processMessageForTenant()
if (routing.route === 'campaigns-only') {
  this.logger.log('⛔ Campaigns-only number - ignoring incoming message');
  return; // Blocks incoming messages
}
```

## Solution Options

### Option 1: Quick Fix - Remove Campaigns-Only Restriction (RECOMMENDED)

Run this SQL command in your tenant database:

```sql
-- Remove campaigns-only restriction from webhook-2
UPDATE "FeatureAssignment" 
SET "campaigns" = NULL 
WHERE "campaigns" = '916429964876580';
```

This allows webhook-2 to handle ALL features including receiving messages.

### Option 2: Assign to WhatsApp Chat

```sql
-- Assign webhook-2 to handle WhatsApp Chat (one-to-one conversations)
UPDATE "FeatureAssignment" 
SET "whatsappChat" = '916429964876580'
WHERE id = 1;
```

### Option 3: Use the Node.js Script

```bash
cd backend
node fix-webhook-receiving.js
```

## Verification Steps

### 1. Check Current Configuration

```sql
SELECT * FROM "FeatureAssignment";
```

You should see something like:
```
id | whatsappChat      | campaigns         | aiChatbot | quickReply | ecommerce
---+-------------------+-------------------+-----------+------------+-----------
1  | 803957376127788   | 916429964876580   | NULL      | NULL       | NULL
```

### 2. Check Webhook Logs

When a customer sends a message to webhook-2, check the backend logs:

**Before Fix:**
```
📍 Routing: campaigns-only for phone 916429964876580
⛔ Campaigns-only number - ignoring incoming message
```

**After Fix:**
```
📍 Routing: default for phone 916429964876580
✓ Message stored successfully
```

### 3. Test Message Flow

1. Send a message from a customer to webhook-2 (916429964876580)
2. Check if the message appears in the WhatsApp chat interface
3. Reply to the customer - they should receive your message

## Feature Assignment Explained

| Feature | Purpose | Incoming Messages | Outgoing Messages |
|---------|---------|-------------------|-------------------|
| `whatsappChat` | One-to-one conversations | ✅ Yes | ✅ Yes |
| `campaigns` | Bulk messaging only | ❌ No | ✅ Yes |
| `aiChatbot` | AI-powered responses | ✅ Yes | ✅ Yes |
| `quickReply` | Quick reply buttons | ✅ Yes | ✅ Yes |
| `ecommerce` | Product catalog | ✅ Yes | ✅ Yes |
| `NULL` (unassigned) | All features | ✅ Yes | ✅ Yes |

## Recommended Configuration

### Scenario 1: Two Phone Numbers for Different Purposes
```sql
UPDATE "FeatureAssignment" SET
  "whatsappChat" = '803957376127788',  -- Webhook-1 for customer conversations
  "campaigns" = '916429964876580'      -- Webhook-2 for bulk campaigns only
WHERE id = 1;
```

### Scenario 2: Both Numbers Handle Everything (RECOMMENDED)
```sql
UPDATE "FeatureAssignment" SET
  "whatsappChat" = NULL,
  "campaigns" = NULL,
  "aiChatbot" = NULL,
  "quickReply" = NULL,
  "ecommerce" = NULL
WHERE id = 1;
```

### Scenario 3: Both Numbers for Customer Conversations
```sql
-- Use webhook-1 as primary
UPDATE "FeatureAssignment" SET
  "whatsappChat" = '803957376127788',
  "campaigns" = NULL
WHERE id = 1;

-- Then manually switch to webhook-2 when needed
```

## Troubleshooting

### Issue: Messages still not received after fix

1. **Restart the backend server**
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Clear the phone number cache**
   The system caches phone number mappings for 1 hour. Wait or restart the server.

3. **Check webhook configuration in Meta**
   - Go to Meta Business Manager
   - Check that webhook URL is: `https://yourdomain.com/whatsapp/webhook/YOUR_VERIFY_TOKEN`
   - Verify token matches the one in your database

4. **Check database connection**
   ```sql
   -- Verify phone number exists in settings
   SELECT * FROM "WhatsAppSettings" WHERE "phoneNumberId" = '916429964876580';
   ```

### Issue: Webhook verification fails

Check the verify token:
```sql
SELECT "verifyToken" FROM "WhatsAppSettings" WHERE "phoneNumberId" = '916429964876580';
```

Make sure it matches the webhook URL: `/whatsapp/webhook/YOUR_VERIFY_TOKEN`

## Testing Checklist

- [ ] Customer sends message to webhook-2
- [ ] Message appears in backend logs
- [ ] Message stored in database (`WhatsAppMessage` table)
- [ ] Message appears in frontend chat interface
- [ ] Reply sent from frontend reaches customer
- [ ] Message status updates (sent → delivered → read)

## Additional Notes

- The system supports **multi-tenant** architecture
- Each tenant can have multiple phone numbers
- Phone numbers can be shared across features or dedicated to specific features
- The routing logic is in `phone-router.service.ts`
- Message processing is in `whatsapp.service.ts` → `processMessageForTenant()`

## Need Help?

If the issue persists:
1. Check backend logs for errors
2. Verify Meta webhook configuration
3. Test with webhook-1 to confirm system is working
4. Check database for `FeatureAssignment` and `WhatsAppSettings` tables
