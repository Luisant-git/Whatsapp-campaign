-- Update default status for SubscriptionOrder to pending
ALTER TABLE "SubscriptionOrder" 
ALTER COLUMN "status" SET DEFAULT 'pending';

-- Update existing active orders to pending (optional - comment out if you want to keep existing orders as active)
-- UPDATE "SubscriptionOrder" SET "status" = 'pending' WHERE "status" = 'active';
