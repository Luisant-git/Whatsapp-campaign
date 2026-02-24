-- Add source field to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'manual';
