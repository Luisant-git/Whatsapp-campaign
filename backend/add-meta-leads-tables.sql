-- Add MetaConfig table
CREATE TABLE IF NOT EXISTS "MetaConfig" (
    "id" SERIAL PRIMARY KEY,
    "pageId" TEXT NOT NULL UNIQUE,
    "accessToken" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Add MetaLead table
CREATE TABLE IF NOT EXISTS "MetaLead" (
    "id" SERIAL PRIMARY KEY,
    "leadId" TEXT NOT NULL UNIQUE,
    "formId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Intake',
    "createdTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "MetaLead_formId_idx" ON "MetaLead"("formId");
CREATE INDEX IF NOT EXISTS "MetaLead_pageId_idx" ON "MetaLead"("pageId");
CREATE INDEX IF NOT EXISTS "MetaLead_status_idx" ON "MetaLead"("status");
