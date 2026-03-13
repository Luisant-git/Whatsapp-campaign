-- Connect to your PostgreSQL database and run this command:
-- Replace 'your_database_name' with your actual database name

\c your_database_name;

-- Add domain column to Tenant table
ALTER TABLE "Tenant" ADD COLUMN "domain" TEXT;

-- Add unique constraint (optional but recommended)
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_domain_key" UNIQUE ("domain");

-- Verify the column was added
\d "Tenant";