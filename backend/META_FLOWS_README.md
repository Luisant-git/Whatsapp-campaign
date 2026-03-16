# Meta WhatsApp Flows Implementation Guide

This guide explains how to implement and use Meta WhatsApp Flows in your project.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup Instructions](#setup-instructions)
4. [Endpoint Configuration](#endpoint-configuration)
5. [Sending Flow Messages](#sending-flow-messages)
6. [Receiving Flow Responses](#receiving-flow-responses)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## 🎯 Overview

WhatsApp Flows allow you to create interactive forms and experiences within WhatsApp. This implementation includes:

- **Flow Endpoint**: Handles data exchange requests from WhatsApp
- **Encryption/Decryption**: Secure communication using RSA + AES-GCM
- **Flow Message Sending**: Send interactive Flow messages to users
- **Webhook Handling**: Process Flow completion responses

## ✅ Prerequisites

1. **Meta Business Account** with WhatsApp Business API access
2. **Verified Business** on Meta Business Manager
3. **Published Flow** in Meta Business Manager
4. **HTTPS Endpoint** (required for production)
5. **Node.js** and **NestJS** backend

## 🚀 Setup Instructions

### Step 1: Generate Encryption Keys

```bash
cd backend
node meta-flow-utils.js generate-keys
```

This creates:
- `flow_private.pem` - Keep this secure on your server
- `flow_public.pem` - Upload to Meta Business Manager

### Step 2: Upload Public Key to Meta

1. Extract your public key:
```bash
node meta-flow-utils.js extract-public-key
```

2. Upload to Meta Business Manager:
   - Go to WhatsApp Manager → Settings → Flows
   - Click "Upload Public Key"
   - Paste your public key
   - Click "Upload"

### Step 3: Configure Environment Variables

Add to your `.env` file:

```env
# Meta App Secret (for signature verification)
META_APP_SECRET=your_app_secret_here

# Your endpoint URL (must be HTTPS in production)
FLOW_ENDPOINT_URL=https://your-domain.com/meta/flows
```

### Step 4: Update App Module

Add `FlowMessageModule` to your `app.module.ts`:

```typescript
import { FlowMessageModule } from './flow-message/flow-message.module';

@Module({
  imports: [
    // ... other modules
    FlowMessageModule,
  ],
})
export class AppModule {}
```

### Step 5: Configure Your Flow in Meta Business Manager

1. Go to WhatsApp Manager → Flows
2. Create or edit your Flow
3. In Flow settings:
   - Set **Data API Version**: `4.0`
   - Set **Endpoint URL**: `https://your-domain.com/meta/flows`
   - Connect your Meta App
4. Publish your Flow

## 🔧 Endpoint Configuration

### Endpoint Structure

Your endpoint is available at: `POST /meta/flows`

It handles three types of requests:

1. **Health Check** (`action: "ping"`)
2. **Data Exchange** (`action: "data_exchange"` or `"INIT"`)
3. **Error Notifications** (when client encounters errors)

### Request Flow

```
User Opens Flow → INIT request → Return initial screen data
User Submits Screen → data_exchange → Return next screen data
User Completes Flow → SUCCESS → Flow closes, webhook sent
```

### Customizing Flow Logic

Edit `src/meta-flow/meta-flow.service.ts`:

```typescript
async processFlow(decryptedData: any): Promise<any> {
  const { screen, data, action } = decryptedData;
  
  // Add your custom logic here
  if (screen === 'YOUR_SCREEN') {
    // Process data
    // Return next screen
    return {
      screen: 'NEXT_SCREEN',
      data: { /* your data */ }
    };
  }
}
```

## 📤 Sending Flow Messages

### Method 1: Interactive Flow Message (User-Initiated)

```typescript
// Using the service
await flowMessageService.sendFlowMessage({
  to: '1234567890',
  flowName: 'appointment_booking_v1',
  flowCta: 'Book Appointment',
  header: '📅 Book Your Appointment',
  body: 'Click below to book',
  flowAction: 'data_exchange'
}, phoneNumberId);
```

### Method 2: Flow Template (Business-Initiated)

First, create a template:

```bash
POST /flow-message/create-template
{
  "wabaId": "your_waba_id",
  "templateName": "appointment_template",
  "category": "UTILITY",
  "language": "en_US",
  "bodyText": "Book your appointment",
  "buttonText": "Book Now",
  "flowName": "appointment_booking_v1",
  "accessToken": "your_token"
}
```

Then send it:

```typescript
await flowMessageService.sendFlowTemplate({
  templateName: 'appointment_template',
  to: '1234567890',
  languageCode: 'en_US',
  flowToken: 'unique_token_123'
}, phoneNumberId);
```

### Method 3: Using Test Script

```bash
# Edit configuration in test-flow-messages.js first
node test-flow-messages.js send-interactive
node test-flow-messages.js send-appointment
```

## 📥 Receiving Flow Responses

When a user completes a Flow, you'll receive a webhook:

```json
{
  "messages": [{
    "from": "1234567890",
    "type": "interactive",
    "interactive": {
      "type": "nfm_reply",
      "nfm_reply": {
        "name": "flow",
        "response_json": "{\"flow_token\":\"abc123\",\"department\":\"cardiology\"}"
      }
    }
  }]
}
```

### Handling in Your Webhook

Add to your webhook handler:

```typescript
import { FlowWebhookService } from './flow-message/flow-webhook.service';

// In your webhook endpoint
if (message.type === 'interactive' && 
    message.interactive?.type === 'nfm_reply') {
  
  await flowWebhookService.processFlowResponse(
    webhookData,
    phoneNumberId
  );
}
```

## 🧪 Testing

### Test Encryption/Decryption

```bash
node meta-flow-utils.js test-encryption
```

### Test Endpoint Connectivity

```bash
curl https://your-domain.com/meta/flows
# Should return: {"status":"active","message":"Meta Flow endpoint is ready"}
```

### Test Flow Message Sending

```bash
node test-flow-messages.js test-connection
node test-flow-messages.js send-interactive
```

### Test with WhatsApp

1. Send a Flow message to your WhatsApp number
2. Open the Flow
3. Complete the form
4. Check your server logs for:
   - Endpoint requests
   - Data processing
   - Webhook responses

## 🔍 Troubleshooting

### Issue: "Decryption failed"

**Solution:**
- Verify your private key matches the uploaded public key
- Check that `flow_private.pem` exists in the backend root
- Ensure the key format is correct (PKCS8)

### Issue: "Invalid signature"

**Solution:**
- Verify `META_APP_SECRET` is set correctly
- Ensure you're using the correct Meta App
- Check that signature verification is enabled

### Issue: "Flow not opening"

**Solution:**
- Verify Flow is published (not draft)
- Check endpoint URL is HTTPS
- Ensure endpoint returns 200 status
- Verify Flow JSON is valid

### Issue: "Endpoint not receiving requests"

**Solution:**
- Check endpoint URL in Flow settings
- Verify SSL certificate is valid
- Check firewall/security settings
- Test endpoint with curl

### Issue: "Flow closes immediately"

**Solution:**
- Check server logs for errors
- Verify response format matches specification
- Ensure all required fields are present
- Check encryption is working correctly

## 📚 API Reference

### Flow Message Service

#### `sendFlowMessage(params, phoneNumberId)`
Send an interactive Flow message.

**Parameters:**
- `to` (string): Recipient phone number
- `flowName` (string): Flow name in Meta Business Manager
- `flowCta` (string): Button text
- `header` (string, optional): Message header
- `body` (string, optional): Message body
- `footer` (string, optional): Message footer
- `flowAction` ('navigate' | 'data_exchange'): Action type
- `flowToken` (string, optional): Unique flow token

#### `sendFlowTemplate(params, phoneNumberId)`
Send a Flow template message.

**Parameters:**
- `templateName` (string): Template name
- `to` (string): Recipient phone number
- `languageCode` (string): Language code (e.g., 'en_US')
- `flowToken` (string, optional): Unique flow token

### Meta Flow Service

#### `processFlow(decryptedData)`
Process Flow data exchange requests.

#### `decryptRequest(encryptedFlowData, encryptedAesKey, initialVector)`
Decrypt incoming Flow requests.

#### `encryptResponse(response, aesKey, iv)`
Encrypt outgoing Flow responses.

## 🔐 Security Best Practices

1. **Keep Private Key Secure**: Never commit `flow_private.pem` to version control
2. **Use HTTPS**: Always use HTTPS for your endpoint in production
3. **Verify Signatures**: Enable signature verification with `META_APP_SECRET`
4. **Validate Flow Tokens**: Use unique, unpredictable flow tokens
5. **Rate Limiting**: Implement rate limiting on your endpoint
6. **Input Validation**: Always validate data from Flow responses

## 📖 Additional Resources

- [Meta Flows Documentation](https://developers.facebook.com/docs/whatsapp/flows)
- [Flow JSON Reference](https://developers.facebook.com/docs/whatsapp/flows/reference/flowjson)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/cloud-api)

## 🆘 Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify all configuration steps
3. Test with the provided utility scripts
4. Review Meta's Flow documentation

## 📝 License

This implementation follows Meta's WhatsApp Flows specification and guidelines.