-- Add metaProductId field to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "metaProductId" TEXT;
