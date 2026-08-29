-- Create MetaLead table if it doesn't exist
CREATE TABLE IF NOT EXISTS "MetaLead" (
  "id"              SERIAL PRIMARY KEY,
  "leadId"          TEXT NOT NULL UNIQUE,
  "formId"          TEXT NOT NULL,
  "pageId"          TEXT NOT NULL,
  "campaignName"    TEXT,
  "name"            TEXT,
  "email"           TEXT,
  "phone"           TEXT,
  "company"         TEXT,
  "city"            TEXT,
  "businessType"    TEXT,
  "customFields"    JSONB DEFAULT '{}',
  "status"          TEXT NOT NULL DEFAULT 'Intake',
  "isAutomationSent" BOOLEAN NOT NULL DEFAULT false,
  "automationSentAt" TIMESTAMP(3),
  "lastAutomationStep" INTEGER NOT NULL DEFAULT 0,
  "createdTime"     TIMESTAMP(3) NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if table already exists (safe to run multiple times)
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "isAutomationSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "automationSentAt" TIMESTAMP(3);
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "lastAutomationStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "campaignName" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "businessType" TEXT;

CREATE INDEX IF NOT EXISTS "MetaLead_formId_idx"       ON "MetaLead"("formId");
CREATE INDEX IF NOT EXISTS "MetaLead_pageId_idx"       ON "MetaLead"("pageId");
CREATE INDEX IF NOT EXISTS "MetaLead_status_idx"       ON "MetaLead"("status");
CREATE INDEX IF NOT EXISTS "MetaLead_campaignName_idx" ON "MetaLead"("campaignName");

-- Create MetaConfig table if it doesn't exist
CREATE TABLE IF NOT EXISTS "MetaConfig" (
  "id"          SERIAL PRIMARY KEY,
  "name"        TEXT NOT NULL UNIQUE,
  "pageId"      TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "verifyToken" TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create MetaLeadAutomation table if it doesn't exist
CREATE TABLE IF NOT EXISTS "MetaLeadAutomation" (
  "id"            SERIAL PRIMARY KEY,
  "templateName"  TEXT NOT NULL,
  "delayMinutes"  INTEGER NOT NULL DEFAULT 5,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
