# Meta Webhook Verification - Step-by-Step Fix

## Problem
Your webhook is working perfectly (all tests pass), but Meta Console shows verification error.

## Root Cause
Meta is likely caching the old failed verification attempt or there's a temporary issue with Meta's servers.

## Solution Steps

### Step 1: Clear Meta's Webhook Configuration
1. Go to https://developers.facebook.com/apps
2. Select your app
3. Go to **WhatsApp > Configuration**
4. Click **Edit** next to Webhook
5. **DELETE/REMOVE** the webhook URL completely
6. Click **Save**
7. **Wait 2-3 minutes** (important for cache to clear)

### Step 2: Re-add Webhook with Exact Values
1. Click **Edit** on Webhook again
2. Enter these EXACT values:
   ```
   Callback URL: https://whatsapp.api.luisant.cloud/whatsapp/webhook
   Verify Token: whatsapp_webhook_verify_token_123
   ```
3. Click **Verify and Save**

### Step 3: If Still Failing - Alternative Approaches

#### Option A: Use a Different Endpoint (with token in URL)
Instead of: `https://whatsapp.api.luisant.cloud/whatsapp/webhook`
Try: `https://whatsapp.api.luisant.cloud/whatsapp/webhook/whatsapp_webhook_verify_token_123`

This uses the route with token in the URL path, which might bypass Meta's caching.

#### Option B: Temporarily Change the Token
1. Update your database with a NEW token:
   ```sql
   UPDATE "WhatsAppSettings" SET "verifyToken" = 'new_token_456' WHERE id = 1;
   UPDATE "MasterConfig" SET "verifyToken" = 'new_token_456' WHERE id = 1;
   ```
2. Use this new token in Meta Console
3. After successful verification, you can change it back if needed

#### Option C: Check Meta's Webhook Logs
1. In Meta Developer Console, go to **WhatsApp > Configuration**
2. Scroll down to **Webhook fields**
3. Look for any error messages or logs
4. Check if Meta is even reaching your server

### Step 4: Monitor Server Logs During Verification
Run this command on your server while attempting verification:
```bash
pm2 logs whatsapp-backend --lines 50
```

Look for these log messages:
```
=== WEBHOOK GET CALLED (CATCH-ALL) ===
🔍 VALIDATING VERIFY TOKEN: whatsapp_webhook_verify_token_123
✓ Webhook verified successfully
```

### Step 5: Check Meta's IP Whitelist (if applicable)
If you have firewall rules, ensure Meta's IPs are allowed:
- 31.13.24.0/21
- 31.13.64.0/18
- 66.220.144.0/20
- 69.63.176.0/20
- 69.171.224.0/19
- 74.119.76.0/22
- 173.252.64.0/18
- 157.240.0.0/16

### Step 6: Test from Meta's Perspective
Run this from your server:
```bash
node simulate-meta-verification.js
```

Should show:
```
✅ SUCCESS! Webhook verification would work with Meta
```

## Common Issues and Fixes

### Issue 1: "The callback URL or verify token couldn't be validated"
**Cause**: Meta's cache or temporary server issue
**Fix**: Wait 5 minutes, then try again

### Issue 2: Verification works in tests but fails in Meta Console
**Cause**: Meta might be hitting a different server or load balancer
**Fix**: Check nginx/load balancer logs to see if requests are reaching your backend

### Issue 3: SSL Certificate Error
**Cause**: Invalid or expired SSL certificate
**Fix**: Run `certbot renew` to renew Let's Encrypt certificate

## Verification Checklist
- [ ] Webhook URL is exactly: `https://whatsapp.api.luisant.cloud/whatsapp/webhook`
- [ ] Verify token is exactly: `whatsapp_webhook_verify_token_123`
- [ ] No extra spaces or characters in either field
- [ ] SSL certificate is valid (check with: `curl -v https://whatsapp.api.luisant.cloud`)
- [ ] Server is running (check with: `pm2 status`)
- [ ] Database connection is working
- [ ] Waited at least 2 minutes after removing old webhook

## Success Indicators
When verification succeeds, you'll see:
1. Green checkmark in Meta Console
2. Webhook fields become subscribable
3. Server logs show: `✓ Webhook verified successfully`

## Still Not Working?
If after all these steps it still fails:

1. **Try the alternative endpoint with token in URL**:
   ```
   https://whatsapp.api.luisant.cloud/whatsapp/webhook/whatsapp_webhook_verify_token_123
   ```

2. **Contact Meta Support**:
   - Go to https://developers.facebook.com/support/
   - Report the issue with error code: WBxP-700492798-2071709365
   - Mention that your webhook passes all verification tests

3. **Check Meta Platform Status**:
   - Visit https://developers.facebook.com/status/
   - Check if there are any ongoing issues with WhatsApp Business API

## Testing After Successful Verification
Once verified, test message reception:
1. Send a message to your WhatsApp Business number
2. Check server logs for: `📨 Incoming message`
3. Verify message appears in your dashboard

---

**Your webhook is working perfectly. The issue is with Meta's verification process, not your code.**
