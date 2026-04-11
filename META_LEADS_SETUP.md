# Meta Lead Ads Integration - Setup Guide

## Overview
This integration automatically syncs leads from Facebook Lead Ads to your Contact database.

## Prerequisites
1. Facebook Page
2. Facebook App with Lead Ads permissions
3. Lead Ad Form created in Facebook Ads Manager

## Backend Setup

### 1. Database Migration
Run Prisma migration to create the MetaLead and MetaConfig tables:

```bash
cd backend
npx prisma migrate dev --name add_meta_leads
npx prisma generate
```

### 2. Environment Variables
Add to your `.env` file:

```env
META_VERIFY_TOKEN=your_verify_token_here
META_ACCESS_TOKEN=your_page_access_token
META_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
```

### 3. Get Facebook Credentials

#### Get Page Access Token:
1. Go to https://developers.facebook.com/tools/explorer/
2. Select your app
3. Click "Get Token" → "Get Page Access Token"
4. Select your page
5. Copy the token (make it long-lived)

#### Get Page ID:
1. Go to your Facebook Page
2. Click "About"
3. Scroll down to find Page ID

#### Get Form ID:
1. Go to Meta Business Suite → Leads Centre
2. Click on your form
3. The Form ID is in the URL: `forms/{FORM_ID}`

### 4. Setup Webhook

#### Configure Webhook URL:
Your webhook URL: `https://yourdomain.com/meta-leads/webhook`

#### Subscribe to Webhooks:
1. Go to Facebook App Dashboard
2. Navigate to "Webhooks" in left menu
3. Click "Add Subscription" → "Page"
4. Enter Callback URL: `https://yourdomain.com/meta-leads/webhook`
5. Enter Verify Token: (same as META_VERIFY_TOKEN in .env)
6. Subscribe to `leadgen` field
7. Click "Verify and Save"

## Frontend Setup

### 1. Add Route
Add to your router configuration:

```jsx
import MetaLeads from './components/MetaLeads';

// In your routes
<Route path="/meta-leads" element={<MetaLeads />} />
```

### 2. Add Navigation Menu
Add link to your navigation:

```jsx
<Link to="/meta-leads">Meta Leads</Link>
```

## Usage

### Manual Sync
1. Go to Meta Leads page
2. Click "Sync Leads" button
3. Enter:
   - Facebook Page ID
   - Form ID
   - Access Token
4. Leads will be synced to database and Contact table

### Automatic Sync (Webhook)
Once webhook is configured, new leads are automatically:
1. Saved to MetaLead table
2. Synced to Contact table
3. Available in your Leads Centre

## API Endpoints

### GET /meta-leads
Fetch all leads with pagination
```
Query params:
- page: number (default: 1)
- limit: number (default: 10)
- search: string
- status: string (Intake|Qualified|Converted)
```

### PATCH /meta-leads/:id/status
Update lead status
```json
{
  "status": "Qualified"
}
```

### POST /meta-leads/sync
Manual sync from Facebook
```json
{
  "pageId": "your_page_id",
  "formId": "your_form_id",
  "accessToken": "your_access_token",
  "phoneNumberId": "optional_phone_number_id"
}
```

### GET /meta-leads/webhook
Webhook verification endpoint

### POST /meta-leads/webhook
Webhook event handler

## Lead Data Mapping

Facebook Lead → Contact Table:
- `full_name` → `name`
- `email` → `email`
- `phone_number` → `phone`
- `company_name` → `place`

## Troubleshooting

### Webhook not receiving events
1. Check webhook subscription is active
2. Verify callback URL is accessible
3. Check verify token matches
4. Review Facebook App logs

### Leads not syncing to Contact
1. Check phone number is present in lead data
2. Verify phoneNumberId is set correctly
3. Check database logs for errors

### Access Token expired
1. Generate new long-lived token
2. Update META_ACCESS_TOKEN in .env
3. Restart backend server

## Testing

### Test Webhook Locally
Use ngrok to expose local server:
```bash
ngrok http 3000
```

Use ngrok URL as webhook callback URL.

### Test Lead Submission
1. Create test lead ad
2. Submit test lead
3. Check webhook receives event
4. Verify lead appears in database
5. Confirm contact is created

## Security Notes

1. Never commit access tokens to git
2. Use environment variables for all credentials
3. Implement rate limiting on webhook endpoint
4. Validate webhook signatures (recommended)
5. Use HTTPS for webhook URL

## Next Steps

1. Add webhook signature validation
2. Implement automatic token refresh
3. Add lead assignment to users
4. Create lead notification system
5. Build analytics dashboard
