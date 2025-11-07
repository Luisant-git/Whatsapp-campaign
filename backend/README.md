# WhatsApp Campaign Backend

A NestJS backend for WhatsApp campaign management with bulk messaging capabilities.

## Features

- ✅ WhatsApp Business API integration
- ✅ Bulk message sending with templates
- ✅ Media file support (images, videos, documents)
- ✅ Message status tracking
- ✅ Interactive chat interface
- ✅ Webhook handling for incoming messages
- ✅ Swagger API documentation

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your WhatsApp Business API credentials.

3. **Setup database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the server:**
   ```bash
   npm run start:dev
   ```

## API Endpoints

### WhatsApp Messages
- `GET /whatsapp/messages` - Get all messages
- `GET /whatsapp/messages?phone=919876543210` - Get messages by phone
- `POST /whatsapp/send-message` - Send single message
- `POST /whatsapp/send-bulk` - Send bulk template messages
- `POST /whatsapp/send-media` - Send media files
- `GET /whatsapp/message-status/:messageId` - Get message status

### Webhook
- `GET /whatsapp/webhook` - Verify webhook
- `POST /whatsapp/webhook` - Handle incoming messages

## API Documentation

Visit `http://localhost:3010/api` for interactive Swagger documentation.

## Environment Variables

```env
DATABASE_URL="postgresql://username:password@localhost:5432/whatsapp_campaign"
WHATSAPP_API_URL="https://graph.facebook.com/v18.0"
WHATSAPP_PHONE_NUMBER_ID="your_phone_number_id"
WHATSAPP_ACCESS_TOKEN="your_access_token"
WHATSAPP_VERIFY_TOKEN="your_verify_token"
UPLOAD_URL="http://localhost:3010/uploads"
PORT=3010
```