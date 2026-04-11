# Meta Lead Ads Integration - Complete Setup

## Summary
This integration automatically syncs Facebook Lead Ads to your Contact database using your existing MasterConfig credentials.

## Step 1: Database Setup

### Run the SQL migration on your tenant database:

```bash
cd backend
psql -d your_tenant_database -f add-meta-leads-tables.sql
```

Or manually run the SQL in your database client.

### Regenerate Prisma Client:

```bash
cd backend
npx prisma generate --schema=./prisma/schema-tenant.prisma
```

## Step 2: Facebook Setup

### 2.1 Get Form ID
1. Go to Meta Business Suite → Leads Centre
2. Click on your lead form
3. Copy the Form ID from URL: `https://business.facebook.com/latest/leads_center/forms/{FORM_ID}`

### 2.2 Setup Webhook
1. Go to Facebook App Dashboard: https://developers.facebook.com/apps
2. Select your app
3. Go to "Webhooks" in left menu
4. Click "Add Subscription" → Select "Page"
5. Enter:
   - **Callback URL**: `https://yourdomain.com/meta-leads/webhook`
   - **Verify Token**: Use the `verifyToken` from your MasterConfig table
6. Subscribe to field: `leadgen`
7. Click "Verify and Save"

### 2.3 Subscribe Page to App
1. In Webhooks section, find your page
2. Click "Subscribe" next to your page
3. Ensure `leadgen` is checked

## Step 3: Verify MasterConfig

Your MasterConfig table should have:
- `accessToken`: Facebook Page Access Token
- `verifyToken`: Webhook verify token
- `phoneNumberId`: WhatsApp Phone Number ID
- `wabaId` or `appId`: Facebook Page ID
- `isActive`: true

## Step 4: Frontend Setup

### Add route to your App.jsx or router:

```jsx
import MetaLeads from './components/MetaLeads';

// In your routes
<Route path="/meta-leads" element={<MetaLeads />} />
```

### Add to navigation menu:

```jsx
<Link to="/meta-leads">Meta Leads</Link>
```

## Step 5: Test the Integration

### Test 1: Manual Sync
1. Go to `/meta-leads` page
2. Click "Sync Leads" button
3. Enter your Form ID
4. Check if leads appear

### Test 2: Webhook (Real-time)
1. Submit a test lead through your Facebook ad
2. Check backend logs for webhook event
3. Verify lead appears in Meta Leads page
4. Verify contact created in Contact table

## How It Works

### Automatic Flow:
1. User submits lead on Facebook
2. Facebook sends webhook to `/meta-leads/webhook`
3. Backend fetches lead details using MasterConfig accessToken
4. Lead saved to MetaLead table
5. Contact automatically created/updated in Contact table

### Manual Sync:
1. User clicks "Sync Leads" button
2. Frontend fetches MasterConfig credentials
3. Backend calls Facebook API to get all leads
4. All leads synced to database and Contact table

## Data Mapping

Facebook Lead → Contact Table:
- `full_name` → `name`
- `email` → `email`  
- `phone_number` → `phone`
- `company_name` → `place`
- `phoneNumberId` → from MasterConfig

## Lead Statuses

- **Intake**: New leads (default)
- **Qualified**: Leads that meet criteria
- **Converted**: Leads that became customers

## API Endpoints

```
GET    /meta-leads              - List all leads
PATCH  /meta-leads/:id/status   - Update lead status
POST   /meta-leads/sync         - Manual sync from Facebook
GET    /meta-leads/webhook      - Webhook verification
POST   /meta-leads/webhook      - Receive new leads
```

## Troubleshooting

### Webhook not working
- Check webhook URL is accessible (use https)
- Verify token matches MasterConfig.verifyToken
- Check Facebook App webhook logs
- Ensure page is subscribed to app

### Leads not syncing to Contact
- Verify phone number exists in lead data
- Check MasterConfig.phoneNumberId is set
- Review backend logs for errors

### Access Token expired
- Generate new long-lived token
- Update MasterConfig.accessToken
- Restart backend

## Security Notes

1. Use HTTPS for webhook URL
2. Keep accessToken secure in database
3. Implement rate limiting on webhook
4. Monitor webhook logs for suspicious activity

## Next Steps

1. ✅ Database tables created
2. ✅ Backend API implemented
3. ✅ Frontend component created
4. ✅ Webhook configured
5. ⏳ Test with real lead submission
6. ⏳ Monitor and optimize

## Support

If you encounter issues:
1. Check backend logs: `pm2 logs` or console
2. Check Facebook webhook logs in App Dashboard
3. Verify MasterConfig has correct credentials
4. Test webhook URL is accessible
