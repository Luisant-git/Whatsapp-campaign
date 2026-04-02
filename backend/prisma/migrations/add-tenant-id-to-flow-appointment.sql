-- Add tenantId column to FlowAppointment table
ALTER TABLE "FlowAppointment" ADD COLUMN "tenantId" INTEGER;

-- Create index on tenantId for better query performance
CREATE INDEX "FlowAppointment_tenantId_idx" ON "FlowAppointment"("tenantId");

-- Update existing records to have a default tenantId (optional)
-- UPDATE "FlowAppointment" SET "tenantId" = 1 WHERE "tenantId" IS NULL;