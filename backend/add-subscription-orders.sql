-- Create SubscriptionOrder table to track all subscription purchases
CREATE TABLE IF NOT EXISTS "SubscriptionOrder" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "planId" INTEGER NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "SubscriptionOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id")
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "SubscriptionOrder_userId_idx" ON "SubscriptionOrder"("userId");
CREATE INDEX IF NOT EXISTS "SubscriptionOrder_createdAt_idx" ON "SubscriptionOrder"("createdAt" DESC);
