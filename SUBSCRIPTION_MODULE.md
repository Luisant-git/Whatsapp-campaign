# Subscription Module

## Overview
Complete subscription management system with admin panel for creating plans and user panel for viewing available subscriptions.

## Database Changes

### Run Migration
```bash
cd backend
psql -U your_username -d your_database -f add-subscription.sql
npx prisma generate
npm run start:dev
```

## Features

### Admin Panel
- **Create Subscription Plans**: Add new plans with name, price, duration, and features
- **Edit Plans**: Update existing subscription plans
- **Delete Plans**: Remove subscription plans
- **Toggle Active Status**: Enable/disable plans
- **Dynamic Features**: Add multiple features per plan

### User Panel
- **View Active Plans**: See all available subscription plans
- **Plan Details**: View price, duration, and features
- **Subscribe Button**: Ready for payment integration

## Files Created

### Backend
- `backend/src/subscription/subscription.controller.ts` - API endpoints
- `backend/src/subscription/subscription.service.ts` - Business logic
- `backend/src/subscription/subscription.module.ts` - Module definition
- `backend/add-subscription.sql` - Database migration
- `backend/prisma/schema.prisma` - Updated with SubscriptionPlan model

### Frontend (User)
- `frontend/src/components/Subscription.jsx` - User subscription page
- `frontend/src/styles/Subscription.css` - Subscription styles
- `frontend/src/api/subscription.js` - API calls
- `frontend/src/App.jsx` - Updated with subscription route

### Admin
- `admin/src/pages/Subscriptions.jsx` - Admin management page
- `admin/src/styles/Subscriptions.css` - Admin styles
- `admin/src/api/subscription.js` - Admin API calls
- `admin/src/App.jsx` - Updated with subscription route
- `admin/src/components/Sidebar.jsx` - Added subscription menu

## API Endpoints

### GET /subscription
Get all subscription plans (admin)

### GET /subscription/active
Get active subscription plans (public)

### POST /subscription
Create new subscription plan
```json
{
  "name": "Basic Plan",
  "price": 29.99,
  "duration": 30,
  "features": ["Feature 1", "Feature 2"],
  "isActive": true
}
```

### PUT /subscription/:id
Update subscription plan

### DELETE /subscription/:id
Delete subscription plan

## Usage

### Admin
1. Navigate to `/subscriptions` in admin panel
2. Click "Add Plan" to create new subscription
3. Fill in plan details and features
4. Save and manage plans

### User
1. Navigate to "Subscription" in user dashboard
2. View available plans
3. Click "Subscribe Now" (ready for payment integration)

## Next Steps
- Integrate payment gateway (Stripe/PayPal)
- Add user subscription assignment
- Implement subscription expiry tracking
- Add subscription history
