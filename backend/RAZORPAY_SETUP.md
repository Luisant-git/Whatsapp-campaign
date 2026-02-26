# Razorpay Payment Integration Setup

## Overview
This integration adds Razorpay payment support to your WhatsApp e-commerce flow.

## Flow
1. Customer selects product from catalog
2. Provides name, address, city, pincode
3. Chooses payment method (Razorpay or COD)
4. If Razorpay: Receives payment link via WhatsApp
5. After successful payment: Receives order confirmation

## Setup Steps

### 1. Update Environment Variables
Add to your `.env` file:
```
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_MERCHANT_ID=acc_JBz4Xiep4JPFoH
PHONE_NUMBER_ID=24366060823054981
BACKEND_URL=http://localhost:3010
```

### 2. Run Database Migration
```bash
cd backend
npx prisma migrate dev --schema=./prisma/schema-tenant.prisma
```

Or manually run the SQL:
```sql
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentLink" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'pending';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isAbandoned" BOOLEAN DEFAULT false;
```

### 3. Restart Server
```bash
npm run start:dev
```

## New Order Fields
- `paymentMethod`: "razorpay" or "cod"
- `paymentId`: Razorpay payment ID
- `paymentLink`: Payment link sent to customer
- `paymentStatus`: "pending", "paid", or "cod"
- `isAbandoned`: Track abandoned carts

## Payment Callback URL
Configure in Razorpay dashboard:
```
http://your-domain.com/api/ecommerce/payment-callback
```

## Testing
1. Send catalog message to customer
2. Customer selects product
3. Provide details when prompted
4. Choose "Razorpay" when asked for payment method
5. Click payment link and complete payment
6. Verify order confirmation message
