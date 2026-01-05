# Quick Reply / AI Chatbot Toggle Feature

## Backend Changes Applied

### 1. Database Schema Update
- Added `useQuickReply` field to User model (default: true)

### 2. API Endpoints Added
- `PUT /user/preference` - Update user preference between Quick Reply and AI Chatbot

### 3. Files Modified
- `backend/prisma/schema.prisma` - Added useQuickReply field
- `backend/src/user/user.controller.ts` - Added preference endpoint
- `backend/src/user/user.service.ts` - Added updatePreference method

## How to Apply Changes

### Step 1: Run Database Migration
```bash
cd backend
npx prisma migrate dev --name add_use_quick_reply
```

OR manually run the SQL:
```bash
psql -U your_username -d your_database -f add-use-quick-reply.sql
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Restart Backend Server
```bash
npm run start:dev
```

## Frontend Changes Applied

### Files Modified
- `frontend/src/api/auth.js` - Added updateUserPreference API function
- `frontend/src/components/Settings.jsx` - Added Response Preference toggle section
- `frontend/src/components/QuickReply.jsx` - Shows current mode status

## How It Works

1. **Default Behavior**: Quick Reply is enabled by default for all users
2. **Settings Page**: Users can toggle between "Quick Reply Buttons" and "AI Chatbot"
3. **Quick Reply Page**: Shows current active mode with a note to change in Settings
4. **System Quick Reply**: Triggers (hi, hello, help, info) will use the selected mode

## User Flow

1. User goes to Settings page
2. Sees "Response Preference" section at the top
3. Clicks either "Quick Reply Buttons" or "AI Chatbot"
4. Preference is saved to database
5. System uses the selected mode for trigger messages
