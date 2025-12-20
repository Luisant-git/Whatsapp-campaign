# Campaign Feature Setup

## Overview
The campaign feature allows users to store bulk messages as campaigns and provides options to rerun and edit them.

## Database Setup

1. Run the SQL script to create campaign tables:
```sql
-- Execute the contents of backend/create-campaign-tables.sql in your PostgreSQL database
```

2. Or use Prisma migration:
```bash
cd backend
npx prisma migrate dev --name add-campaigns
```

## Features

### 1. Automatic Campaign Creation
- When users send bulk messages, a campaign is automatically created
- Campaign stores: name, template, contacts, parameters, and execution results

### 2. Campaign Management
- **View Campaigns**: See all campaigns with status, success/failure counts
- **Edit Campaign**: Modify campaign name, template, and contacts
- **Rerun Campaign**: Execute the same campaign again with updated data
- **Delete Campaign**: Remove campaigns that are no longer needed

### 3. Campaign Status Tracking
- `draft`: Campaign created but not executed
- `running`: Campaign is currently being executed
- `completed`: Campaign execution finished
- `failed`: Campaign execution failed

## API Endpoints

### Campaign CRUD Operations
- `POST /api/whatsapp/campaigns` - Create new campaign
- `GET /api/whatsapp/campaigns` - Get all campaigns
- `GET /api/whatsapp/campaigns/:id` - Get specific campaign
- `PUT /api/whatsapp/campaigns/:id` - Update campaign
- `DELETE /api/whatsapp/campaigns/:id` - Delete campaign

### Campaign Execution
- `POST /api/whatsapp/campaigns/:id/run` - Run/Rerun campaign

### Enhanced Bulk Messaging
- `POST /api/whatsapp/send-bulk` - Send bulk messages and create campaign

## Frontend Usage

1. **Send Bulk Messages**: Use the existing bulk message feature - campaigns are created automatically
2. **View Campaigns**: Navigate to the "Campaigns" section in the sidebar
3. **Manage Campaigns**: Use the Rerun, Edit, and Delete buttons for each campaign

## Campaign Data Structure

```json
{
  "id": 1,
  "name": "Diwali Promotion 2024",
  "templateName": "luisant_diwali_website50_v1",
  "status": "completed",
  "totalCount": 100,
  "successCount": 95,
  "failedCount": 5,
  "contacts": [
    {"name": "John Doe", "phone": "919876543210"},
    {"name": "Jane Smith", "phone": "919876543211"}
  ],
  "messages": [
    {
      "phone": "919876543210",
      "name": "John Doe",
      "status": "sent",
      "messageId": "wamid.xxx"
    }
  ]
}
```

## Benefits

1. **Reusability**: Easily rerun successful campaigns
2. **Tracking**: Monitor campaign performance and delivery status
3. **Management**: Edit and update campaigns before rerunning
4. **History**: Keep track of all bulk messaging activities
5. **Analytics**: View success/failure rates for each campaign