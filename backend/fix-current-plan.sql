-- Set the most recent active order as current plan for each user who doesn't have one
UPDATE "SubscriptionOrder" o1
SET "isCurrentPlan" = true
WHERE "status" = 'active'
AND "isCurrentPlan" = false
AND "id" = (
  SELECT "id" 
  FROM "SubscriptionOrder" o2 
  WHERE o2."userId" = o1."userId" 
  AND o2."status" = 'active'
  ORDER BY "createdAt" DESC 
  LIMIT 1
);
