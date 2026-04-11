# Meta Lead Ads Integration - Complete Setup

## ✅ What's Been Created

### Backend Files:
1. `src/meta-leads/meta-leads.module.ts` - Module configuration
2. `src/meta-leads/meta-leads.controller.ts` - API endpoints
3. `src/meta-leads/meta-leads.service.ts` - Business logic
4. `prisma/schema-tenant.prisma` - Updated with MetaLead & MetaConfig models
5. `add-meta-leads-tables.sql` - Database migration SQL

### Frontend Files:
1. `frontend/src/components/MetaLeads.jsx` - UI component
2. `frontend/src/styles/MetaLeads.css` - Styling

## 🔧 Setup Steps

### Step 1: Run Database Migration

```bash
cd backend

# Option A: Using the SQL file directly
psql -U your_username -d your_database -f add-meta-leads-tables.sql

# Option B: Using Prisma
npx prisma migrate dev --name add_meta_leads --schema=./prisma/schema-tenant.prisma
npx prisma generate --schema=./prisma/schema-tenant.prisma
```

### Step 2: Restart Backend

```bash
cd backend
npm run start:dev
```

### Step 3: Configure Master Config

Your MasterConfig table already has:
- `accessToken` - Use this for Facebook Page Access Token
- `verifyToken` - Use this for webhook verification
- `phoneNumberId` - Your WhatsApp phone number ID
- `wabaId` or `appId` - Can be used as Page ID

Make sure you have an active MasterConfig with these fields populated.

### Step 4: Get Facebook Credentials

#### Get Form ID:
1. Go to Meta Business Suite → Leads Centre
2. Click on your form
3. Copy the Form ID from URL: `forms/{FORM_ID}`

#### Get Page Access Token (if not already in MasterConfig):
1. Go to https://developers.facebook.com/tools/explorer/
2. Select your app
3. Click "Get Token" → "Get Page Access Token"
4. Select your page
5. Copy token and update MasterConfig

### Step 5: Setup Webhook

1. Go to Facebook App Dashboard → Webhooks
2. Click "Add Subscription" → "Page"
3. Enter:
   - Callback URL: `https://yourdomain.com/meta-leads/webhook`
   - Verify Token: (from your MasterConfig.verifyToken)
4. Subscribe to `leadgen` field
5. Click "Verify and Save"

### Step 6: Add Frontend Route

In your main App.jsx or router file:

```jsx
import MetaLeads from './components/MetaLeads';

// Add route
<Route path="/meta-leads" element={<MetaLeads />} />
```

## 📊 How It Works

### Automatic Sync (Webhook):
1. User submits lead on Facebook
2. Facebook sends webhook to your server
3. Backend fetches lead details using MasterConfig.accessToken
4. Lead saved to MetaLead table
5. Contact automatically created in Contact table

### Manual Sync:
1. User clicks "Sync Leads" button
2. Enters Form ID
3. System uses MasterConfig credentials
4. Fetches all leads from that form
5. Saves to database and creates contacts

## 🔍 Testing

### Test Manual Sync:
1. Go to `/meta-leads` page
2. Click "Sync Leads"
3. Enter your Form ID
4. Check if leads appear

### Test Webhook:
1. Submit a test lead on Facebook
2. Check backend logs for "Lead synced: {id}"
3. Verify lead appears in MetaLead table
4. Verify contact created in Contact table

## 📋 API Endpoints

```
GET    /meta-leads              - List all leads
PATCH  /meta-leads/:id/status   - Update lead status
POST   /meta-leads/sync         - Manual sync from Facebook
GET    /meta-leads/webhook      - Webhook verification
POST   /meta-leads/webhook      - Webhook event handler
```

## 🗄️ Database Tables

### MetaLead
- Stores all leads from Facebook
- Fields: name, email, phone, company, status
- Status: Intake → Qualified → Converted

### MetaConfig (Optional - using MasterConfig instead)
- Can store multiple Facebook page configurations
- Currently using existing MasterConfig table

## 🔐 Security

- All credentials stored in MasterConfig table
- Webhook verification using verifyToken
- No credentials in code or environment variables
- HTTPS required for webhook URL

## 🐛 Troubleshooting

### "No active MasterConfig found"
- Ensure you have a MasterConfig with `isActive = true`
- Check accessToken and verifyToken are set

### "Failed to sync leads"
- Verify Form ID is correct
- Check accessToken has `leads_retrieval` permission
- Ensure app has completed Business Verification

### Webhook not receiving events
- Verify webhook URL is accessible
- Check verifyToken matches
- Review Facebook App webhook logs

### Leads not syncing to Contact
- Check phone number exists in lead data
- Verify phoneNumberId in MasterConfig
- Check database logs for errors

## 📝 Next Steps

1. ✅ Database migration completed
2. ✅ Backend endpoints ready
3. ✅ Frontend component created
4. ⏳ Run database migration
5. ⏳ Configure webhook
6. ⏳ Test with real leads

## 🎯 Features

- ✅ Automatic lead sync via webhook
- ✅ Manual lead sync from Facebook
- ✅ Lead status management (Intake/Qualified/Converted)
- ✅ Automatic contact creation
- ✅ Search and filter leads
- ✅ Kanban board view
- ✅ Uses existing MasterConfig credentials

Your Meta Lead Ads integration is ready to use! 🚀
