-- Add isCurrentPlan field to SubscriptionOrder table
ALTER TABLE "SubscriptionOrder" 
ADD COLUMN IF NOT EXISTS "isCurrentPlan" BOOLEAN NOT NULL DEFAULT false;

-- Set the most recent active order as current plan for each user
UPDATE "SubscriptionOrder" o1
SET "isCurrentPlan" = true
WHERE "status" = 'active'
AND "id" = (
  SELECT "id" 
  FROM "SubscriptionOrder" o2 
  WHERE o2."userId" = o1."userId" 
  AND o2."status" = 'active'
  ORDER BY "createdAt" DESC 
  LIMIT 1
);
