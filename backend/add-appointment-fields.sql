-- Add tenantId, status, and remarks columns to FlowAppointment table
ALTER TABLE "FlowAppointment" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "FlowAppointment" ADD COLUMN "status" TEXT DEFAULT 'confirmed';
ALTER TABLE "FlowAppointment" ADD COLUMN "remarks" TEXT;

-- Create indexes for better query performance
CREATE INDEX "FlowAppointment_tenantId_idx" ON "FlowAppointment"("tenantId");
CREATE INDEX "FlowAppointment_status_idx" ON "FlowAppointment"("status");

-- Update existing records to have default status
UPDATE "FlowAppointment" SET "status" = 'confirmed' WHERE "status" IS NULL;