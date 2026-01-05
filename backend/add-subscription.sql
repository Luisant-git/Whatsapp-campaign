-- Create SubscriptionPlan table
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "duration" INTEGER NOT NULL,
  "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Add subscriptionId to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionId" INTEGER;

-- Add foreign key constraint
ALTER TABLE "User" ADD CONSTRAINT "User_subscriptionId_fkey" 
  FOREIGN KEY ("subscriptionId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
