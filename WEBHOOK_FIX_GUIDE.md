# 🔧 Webhook Not Working - Complete Fix Guide

## ❌ Issues Found

### 1. **Master Config Verify Token Not Checked**
- Your webhook verification only checks `whatsAppSettings` table
- When you add credentials in Master Config, the verify token is stored there
- Webhook fails because it can't find the verify token

### 2. **Phone Number ID Mismatch**
- Master Config uses different phone number IDs
- Webhook receives messages but can't route them to the correct tenant

### 3. **Missing Master Config Support in Webhook Handlers**
- `validateVerifyToken()` - ❌ Only checks WhatsApp Settings
- `findUserByVerifyToken()` - ❌ Only checks WhatsApp Settings  
- `findAllUsersByPhoneNumberId()` - ❌ Only checks WhatsApp Settings

---

## ✅ Fixes Applied

### **File: `whatsapp.service.ts`**

#### 1. Updated `validateVerifyToken()` method
```typescript
async validateVerifyToken(token: string): Promise<boolean> {
  // Now checks BOTH:
  // ✅ whatsAppSettings.verifyToken
  // ✅ masterConfig.verifyToken
}
```

#### 2. Updated `findUserByVerifyToken()` method
```typescript
async findUserByVerifyToken(token: string): Promise<number | null> {
  // Now checks BOTH:
  // ✅ whatsAppSettings.verifyToken
  // ✅ masterConfig.verifyToken
}
```

#### 3. Updated `findAllUsersByPhoneNumberId()` method
```typescript
async findAllUsersByPhoneNumberId(phoneNumberId: string): Promise<number[]> {
  // Now checks BOTH:
  // ✅ whatsAppSettings.phoneNumberId
  // ✅ masterConfig.phoneNumberId
}
```

---

## 🔗 Webhook URL Configuration

### **For Production (Meta Developer Console)**

1. Go to: https://developers.facebook.com/apps/
2. Select your app → WhatsApp → Configuration
3. Set webhook URL to:

```
https://yourdomain.com/whatsapp/webhook/YOUR_VERIFY_TOKEN
```

**Replace:**
- `yourdomain.com` → Your actual domain
- `YOUR_VERIFY_TOKEN` → The verify token from Master Config

### **Example:**
If your verify token is `abc123xyz`, use:
```
https://api.yourcompany.com/whatsapp/webhook/abc123xyz
```

---

## 📋 Verification Checklist

### ✅ Step 1: Check Master Config
```sql
-- Run this in your database to verify Master Config exists
SELECT id, name, phoneNumberId, verifyToken 
FROM "MasterConfig" 
WHERE verifyToken IS NOT NULL;
```

### ✅ Step 2: Test Webhook Verification (GET Request)
```bash
curl "https://yourdomain.com/whatsapp/webhook/YOUR_VERIFY_TOKEN?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
```

**Expected Response:** `test123`

### ✅ Step 3: Check Webhook Logs
```bash
# In your backend directory
tail -f logs/webhook.log

# Or check console logs
pm2 logs backend
```

### ✅ Step 4: Test Incoming Message
Send a WhatsApp message to your business number and check:
1. Backend logs show: `📨 Webhook received`
2. Message appears in your chat interface
3. No errors in console

---

## 🚨 Common Issues & Solutions

### Issue 1: "Webhook verification failed"
**Cause:** Verify token mismatch

**Solution:**
1. Check Master Config verify token in database
2. Update Meta webhook URL with correct token
3. Restart backend: `pm2 restart backend`

### Issue 2: "No tenant found with phoneNumberId"
**Cause:** Phone Number ID not in Master Config

**Solution:**
1. Verify Phone Number ID in Master Config matches Meta
2. Check database:
```sql
SELECT phoneNumberId FROM "MasterConfig";
```
3. Update if needed in Master Config UI

### Issue 3: Messages not routing to correct feature
**Cause:** Feature assignments not configured

**Solution:**
1. Go to Master Config → Feature Assignments
2. Assign phone numbers to features:
   - WhatsApp Chat
   - AI Chatbot
   - Quick Reply
   - Ecommerce
   - Campaigns

### Issue 4: "403 Forbidden" on webhook
**Cause:** Nginx/proxy blocking requests

**Solution:**
```nginx
# Add to nginx config
location /whatsapp/webhook {
    proxy_pass http://localhost:3010;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 120s;
}
```

---

## 🔍 Debug Mode

### Enable Detailed Logging

Add to your `.env`:
```env
LOG_LEVEL=debug
WEBHOOK_DEBUG=true
```

### Check Webhook Payload

The webhook controller logs full payload:
```typescript
console.log('Webhook Body:', JSON.stringify(body, null, 2));
console.log('Phone Number ID:', phoneNumberId);
console.log('Verify Token:', verifyToken);
```

---

## 📞 Meta Webhook Requirements

### Required Webhook Events (Subscribe to these in Meta):
- ✅ `messages` - Incoming messages
- ✅ `message_status` - Delivery status
- ✅ `message_template_status_update` - Template approvals

### Webhook Fields:
- ✅ `messages`
- ✅ `messaging_product`
- ✅ `contacts`
- ✅ `statuses`

---

## 🎯 Final Steps

1. ✅ Apply code fixes (already done)
2. ✅ Restart backend: `pm2 restart backend`
3. ✅ Update Meta webhook URL with correct verify token
4. ✅ Test webhook verification (GET request)
5. ✅ Send test message to verify incoming webhooks work
6. ✅ Check feature routing (AI bot, quick reply, etc.)

---

## 📝 Notes

- Webhook URL must be HTTPS in production
- Verify token is case-sensitive
- Phone Number ID must match exactly (no spaces)
- Master Config takes priority over WhatsApp Settings
- Feature assignments are optional (defaults to WhatsApp Chat)

---

## 🆘 Still Not Working?

### Check These:

1. **Database Connection**
```bash
# Test database connectivity
psql -h localhost -U postgres -d your_database
```

2. **Backend Running**
```bash
pm2 status
pm2 logs backend --lines 50
```

3. **Firewall/Security**
```bash
# Check if port 3010 is accessible
curl http://localhost:3010/health
```

4. **Meta App Status**
- App must be in "Live" mode (not Development)
- Business verification completed
- WhatsApp Business API access approved

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Webhook verification returns challenge
- ✅ Incoming messages appear in logs
- ✅ Messages show in your chat interface
- ✅ Auto-replies work
- ✅ No 403/404 errors in Meta webhook logs

---

**Last Updated:** $(date)
**Status:** Fixes Applied ✅
