# 🔥 Multi-Number WhatsApp Webhook Setup

## ✅ What's Supported

- ✅ Multiple WhatsApp numbers → **ONE webhook URL**
- ✅ Each number has **different features** (campaigns, catalog, AI bot, etc.)
- ✅ **Two-way messaging** (send + receive both work)
- ✅ Used by big companies in production

---

## 📞 How It Works

### 1. Webhook receives `phone_number_id`

```json
{
  "entry": [{
    "changes": [{
      "value": {
        "metadata": {
          "phone_number_id": "123456789",
          "display_phone_number": "919876543210"
        },
        "messages": [...]
      }
    }]
  }]
}
```

### 2. Backend routes based on `phone_number_id`

```typescript
// phone-router.service.ts
if (phone_number_id === "111") {
  // Route to ecommerce
} else if (phone_number_id === "222") {
  // Route to AI chatbot
} else if (phone_number_id === "333") {
  // Route to campaigns (send-only)
}
```

---

## 🎯 Example Setup

| Phone Number | Purpose | Features |
|-------------|---------|----------|
| +91XXXX1 | Campaign sending | `campaigns` only |
| +91XXXX2 | Ecommerce catalog | `metaCatalog`, `oneToOneChat` |
| +91XXXX3 | AI chatbot | `aiChatbot`, `oneToOneChat` |
| +91XXXX4 | Quick reply automation | `quickReply`, `autoReply` |
| +91XXXX5 | Manual support | `oneToOneChat` |
| +91XXXX6 | All features | All enabled |

**ALL → Same webhook:** `https://yourdomain.com/whatsapp/webhook/YOUR_TOKEN`

---

## 🚀 Setup Steps

### Step 1: Configure Phone Numbers

Run the configuration script:

```bash
npm run ts-node scripts/configure-phone-features-updated.ts
```

Update with your actual `phone_number_id` values.

### Step 2: Set Webhook in Meta Console

For **ALL** phone numbers, use the **SAME** webhook URL:

```
https://yourdomain.com/whatsapp/webhook/YOUR_VERIFY_TOKEN
```

### Step 3: Test

Send message from customer → Your system receives it with `phone_number_id` → Routes to correct feature.

---

## 🔥 Key Files

1. **phone-router.service.ts** - Routes messages based on phone_number_id
2. **whatsapp.service.ts** - Processes messages after routing
3. **whatsapp.controller.ts** - Webhook endpoint (already extracts phone_number_id)

---

## ⚠️ Important Notes

### ✅ DO:
- Use **1 webhook URL** for all numbers
- Detect `phone_number_id` in webhook
- Route logic internally

### ❌ DON'T:
- Create 6 different webhooks
- Create 6 backend servers
- Hardcode phone numbers

---

## 💡 Routing Logic

```typescript
// Campaigns-only number
if (enabledFeatures === ['campaigns']) {
  // Block incoming messages
  // Only allow outgoing campaigns
}

// Ecommerce number
if (enabledFeatures.includes('metaCatalog')) {
  // Route to catalog service
}

// AI Bot number
if (enabledFeatures.includes('aiChatbot')) {
  // Route to chatbot service
}

// Quick Reply number
if (enabledFeatures.includes('quickReply')) {
  // Route to session service
}
```

---

## 🎉 Result

✅ Multiple numbers → single webhook
✅ Send + receive messages → works
✅ Each number has different feature
✅ Use `phone_number_id` to identify

**This is the correct production architecture.**
