# WhatsApp Webhook 403 Forbidden - Fix Summary

## Problem
The webhook endpoint `https://whatsapp.api.luisant.cloud/whatsapp/webhook` was returning:
```json
{"statusCode":403,"message":"Forbidden"}
```

## Root Cause
The webhook GET endpoint expects specific query parameters for WhatsApp verification:
- `hub.mode` (should be "subscribe")
- `hub.verify_token` (your configured token)
- `hub.challenge` (verification string from WhatsApp)

When accessing the URL directly without these parameters, the endpoint throws a 403 Forbidden error.

## Changes Made

### 1. Added @Public() Decorator
Added `@Public()` decorator to all webhook routes to ensure they're publicly accessible:

**File: `src/whatsapp/whatsapp.controller.ts`**
- `@Get('webhook/:verifyToken')` - Webhook verification with token in URL
- `@Get('webhook')` - Webhook verification catch-all
- `@Post('webhook/:verifyToken')` - Webhook handler with token
- `@Post('webhook')` - Webhook handler catch-all

**File: `src/ecommerce/webhook.controller.ts`**
- `@Post('whatsapp')` - WhatsApp ecommerce webhook
- `@Post('razorpay')` - Razorpay payment webhook
- `@Post('payment-success/:orderId')` - Manual payment confirmation

### 2. Improved Error Message
Changed the generic "Forbidden" error to a more descriptive message:
```typescript
throw new HttpException(
  'Webhook verification failed. Expected query parameters: hub.mode, hub.verify_token, hub.challenge',
  HttpStatus.FORBIDDEN
);
```

## How WhatsApp Webhook Verification Works

### Step 1: WhatsApp sends GET request
When you configure the webhook in Meta Developer Console, WhatsApp sends:
```
GET https://your-domain.com/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE_STRING
```

### Step 2: Your server validates
Your server should:
1. Check if `hub.mode === 'subscribe'`
2. Validate `hub.verify_token` matches your configured token
3. Return the `hub.challenge` value as plain text

### Step 3: WhatsApp confirms
If the challenge is returned correctly, WhatsApp marks the webhook as verified.

## Configuration Steps

### 1. Set up your verify token in the database
The verify token is stored in your tenant's settings. Make sure it's configured:
```sql
-- Check current verify token
SELECT "verifyToken" FROM "Settings" WHERE "userId" = YOUR_USER_ID;

-- Update if needed
UPDATE "Settings" SET "verifyToken" = 'your_secure_token_here' WHERE "userId" = YOUR_USER_ID;
```

### 2. Configure in Meta Developer Console
1. Go to https://developers.facebook.com/apps
2. Select your app
3. Go to WhatsApp > Configuration
4. Click "Edit" on Webhook
5. Enter:
   - **Callback URL**: `https://whatsapp.api.luisant.cloud/whatsapp/webhook`
   - **Verify Token**: Same token from your database
6. Click "Verify and Save"

### 3. Subscribe to webhook fields
Make sure you're subscribed to:
- ✅ messages
- ✅ message_status
- ✅ messaging_postbacks (if using interactive messages)

## Testing

### Test webhook verification locally:
```bash
node test-webhook-access.js
```

### Test with curl:
```bash
# Test verification
curl "http://localhost:3010/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"

# Should return: test123
```

### Test POST webhook:
```bash
curl -X POST http://localhost:3010/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[]}'

# Should return: EVENT_RECEIVED
```

## Production Deployment

After deploying these changes:

1. **Restart your backend server**
   ```bash
   pm2 restart whatsapp-backend
   # or
   npm run start:prod
   ```

2. **Verify the webhook in Meta Console**
   - The verification should now succeed

3. **Test with a real message**
   - Send a message to your WhatsApp Business number
   - Check server logs to confirm webhook is receiving messages

## Troubleshooting

### Still getting 403?
1. Check if changes are deployed: `git log --oneline -1`
2. Verify server is running: `pm2 status` or `ps aux | grep node`
3. Check nginx logs: `tail -f /var/log/nginx/error.log`
4. Check application logs: `pm2 logs whatsapp-backend`

### Webhook verification fails in Meta Console?
1. Ensure verify token in database matches Meta Console
2. Check if URL is accessible: `curl https://whatsapp.api.luisant.cloud/whatsapp/webhook`
3. Verify SSL certificate is valid
4. Check firewall rules allow Meta's IPs

### Messages not being received?
1. Verify webhook is subscribed to "messages" field
2. Check if phone number ID is correct in settings
3. Review application logs for errors
4. Ensure database connections are working

## Security Notes

1. **Verify Token**: Use a strong, random token (at least 32 characters)
2. **HTTPS Only**: WhatsApp requires HTTPS for webhooks
3. **Signature Verification**: Consider adding webhook signature verification for production
4. **Rate Limiting**: Implement rate limiting on webhook endpoints

## Related Files
- `src/whatsapp/whatsapp.controller.ts` - Main webhook handlers
- `src/ecommerce/webhook.controller.ts` - Ecommerce webhooks
- `src/auth/public.decorator.ts` - Public route decorator
- `src/app.module.ts` - Middleware configuration
- `test-webhook-access.js` - Testing script
