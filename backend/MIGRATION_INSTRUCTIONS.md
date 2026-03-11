# Database Migration Instructions

## Add appId to MasterConfig

The schema has been updated to include `appId` field in MasterConfig. Follow these steps:

### 1. Run Prisma Migration

```bash
cd backend
npx prisma migrate dev --name add_app_id_to_master_config --schema=./prisma/schema-tenant.prisma
```

### 2. Update Your MasterConfig Record

After migration, update your active MasterConfig with your Meta App ID:

```sql
-- Find your App ID in Meta Developer Console (https://developers.facebook.com/apps/)
-- Then update your MasterConfig:

UPDATE "MasterConfig" 
SET "appId" = 'YOUR_META_APP_ID_HERE'
WHERE "isActive" = true;
```

### 3. How to Find Your Meta App ID

1. Go to https://developers.facebook.com/apps/
2. Select your WhatsApp Business app
3. The App ID is shown at the top of the page (usually a long number like `1234567890123456`)

### 4. Verify Configuration

Your MasterConfig should now have:
- `phoneNumberId`: Used for sending messages and uploading media for messages
- `wabaId`: Used for creating templates
- `appId`: Used for uploading media for template creation
- `accessToken`: Must have `whatsapp_business_management` permission

## Summary of API Endpoints

| Action | Endpoint | ID Used |
|--------|----------|---------|
| Upload template media | `/{appId}/uploads` | App ID |
| Create template | `/{wabaId}/message_templates` | WABA ID |
| Upload message media | `/{phoneNumberId}/media` | Phone Number ID |
| Send message | `/{phoneNumberId}/messages` | Phone Number ID |

## Example Values

Based on your current setup:
- Phone Number ID: `803957376127788`
- WABA ID: `24366060823054981`
- App ID: `[You need to add this from Meta Developer Console]`
