-- Add payment fields to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentLink" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'pending';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isAbandoned" BOOLEAN DEFAULT false;
