# 🚀 Quick Start: Flow Trigger Feature

## What Changed?
✅ Added automatic flow triggering based on keywords
✅ No more manual sending - flows trigger automatically when users send specific words
✅ Full UI in Flow Manager to create and manage triggers

## Setup (3 Steps)

### Step 1: Update Database
```bash
cd backend
npx prisma db push --schema=./prisma/schema-tenant.prisma
npx prisma generate --schema=./prisma/schema-tenant.prisma
```

### Step 2: Restart Backend
```bash
npm run start:dev
```

### Step 3: Create Your First Trigger
1. Open frontend → Go to **Flow Manager**
2. Click **"Create Trigger"**
3. Fill in:
   - Name: "Appointment Booking"
   - Trigger Word: "book"
   - Select your Flow
   - Button Text: "Start Booking"
4. Click **"Create Trigger"**

## How It Works

**Before (Manual):**
- You had to manually select contacts
- Send flow to each person individually
- Time-consuming process

**Now (Automatic):**
- User sends: "book"
- System automatically sends the flow
- Works 24/7 without intervention

## Example

```
User: book
Bot: [Sends Appointment Flow automatically]
     ┌─────────────────────────┐
     │ Book Your Appointment   │
     │ [Start Booking] →       │
     └─────────────────────────┘
```

## Files Modified

### Backend:
- ✅ `whatsapp.service.ts` - Added flow trigger check
- ✅ `whatsapp.module.ts` - Imported FlowMessageModule
- ✅ `schema-tenant.prisma` - Added FlowTrigger tables
- ✅ `add-flow-trigger-tables.sql` - SQL migration

### Frontend:
- ✅ Already has `FlowManager.jsx` component
- ✅ Already has `flowTrigger.js` API
- ✅ No changes needed!

## Testing

1. Create a trigger with word "test"
2. Send "test" from WhatsApp to your business number
3. You should receive the flow automatically!

## Need Help?
See `FLOW_TRIGGER_GUIDE.md` for detailed documentation.
