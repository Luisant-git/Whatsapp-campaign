# Subscription Module

## Overview
Complete subscription management system with user subscriptions, current plan display, and admin management.

## Features

### User Features
- View all available subscription plans
- See current active subscription with expiry date
- Subscribe to any plan with one click
- Visual indication of current plan
- Subscription status (Active/Expired)

### Admin Features
- Create, edit, and delete subscription plans
- View all subscription plans
- View all user subscriptions in a table
- Track subscription status (Active/Expired)
- Manage plan features and pricing

## Database Schema

### User Table Updates
```sql
subscriptionId: Int?
subscriptionStartDate: DateTime?
subscriptionEndDate: DateTime?
```

### SubscriptionPlan Table
```sql
id: Int (Primary Key)
name: String
price: Float
duration: Int (in days)
features: String[]
isActive: Boolean
createdAt: DateTime
updatedAt: DateTime
```

## API Endpoints

### Public Endpoints
- `GET /subscription` - Get all subscription plans
- `GET /subscription/active` - Get active plans only

### User Endpoints (Authenticated)
- `GET /subscription/current` - Get user's current subscription
- `POST /subscription/subscribe/:planId` - Subscribe to a plan

### Admin Endpoints (Authenticated)
- `POST /subscription` - Create new plan
- `PUT /subscription/:id` - Update plan
- `DELETE /subscription/:id` - Delete plan
- `GET /subscription/users` - Get all user subscriptions

## Setup Instructions

### 1. Database Migration
Run the migration to add subscription date fields:
```bash
cd backend
psql -U your_username -d your_database -f add-subscription-dates.sql
```

Or using Prisma:
```bash
npx prisma migrate dev --name add-subscription-dates
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Restart Backend
```bash
npm run start:dev
```

## Usage

### For Users
1. Navigate to Subscription page
2. View available plans
3. Click "Subscribe Now" on desired plan
4. Current plan will be displayed at the top with expiry date

### For Admins
1. Navigate to Subscriptions in admin panel
2. Use "Plans" tab to manage subscription plans
3. Use "User Subscriptions" tab to view all user subscriptions
4. Create/Edit/Delete plans as needed

## File Structure

### Backend
```
backend/src/subscription/
├── subscription.controller.ts  # API endpoints
├── subscription.service.ts     # Business logic
└── subscription.module.ts      # Module definition
```

### Frontend (User)
```
frontend/src/
├── components/Subscription.jsx
├── styles/Subscription.css
└── api/subscription.js
```

### Admin
```
admin/src/
├── pages/Subscriptions.jsx
├── styles/Subscriptions.css
└── api/subscription.js
```

## Features Implemented

✅ User can view all active subscription plans
✅ User can subscribe to a plan
✅ User can see their current plan with expiry date
✅ Admin can create/edit/delete plans
✅ Admin can view all user subscriptions
✅ Subscription status tracking (Active/Expired)
✅ Automatic expiry date calculation
✅ Visual indicators for current plan
✅ Responsive design for all screens

## Future Enhancements
- Payment gateway integration
- Auto-renewal functionality
- Email notifications for expiring subscriptions
- Subscription history tracking
- Promo codes and discounts
- Trial periods
