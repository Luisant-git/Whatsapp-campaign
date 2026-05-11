-- Step 1: Remove duplicate contacts, keep the oldest (lowest id) per phone
DELETE FROM "Contact"
WHERE id NOT IN (
  SELECT MIN(id)
  FROM "Contact"
  GROUP BY phone
);

-- Step 2: Drop old composite unique index
DROP INDEX IF EXISTS "Contact_phone_phoneNumberId_key";
DROP INDEX IF EXISTS "Contact_phone_null_phoneNumberId_key";

-- Step 3: Add new unique constraint on phone alone
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_phone_key" UNIQUE ("phone");
