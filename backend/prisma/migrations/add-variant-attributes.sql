-- Add variant attribute columns to ProductVariant table
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "size" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "pattern" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "material" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "ageGroup" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "customAttribute" TEXT;
