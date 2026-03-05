-- Create FlowTrigger table for trigger-based flows
CREATE TABLE IF NOT EXISTS "FlowTrigger" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "triggerWord" TEXT NOT NULL,
  "flowId" TEXT NOT NULL,
  "headerText" TEXT,
  "bodyText" TEXT,
  "footerText" TEXT,
  "ctaText" TEXT NOT NULL,
  "screenName" TEXT DEFAULT 'APPOINTMENT',
  "screenData" JSONB DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowTrigger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create index for faster trigger word lookup
CREATE INDEX IF NOT EXISTS "FlowTrigger_triggerWord_idx" ON "FlowTrigger"("triggerWord");
CREATE INDEX IF NOT EXISTS "FlowTrigger_userId_idx" ON "FlowTrigger"("userId");
CREATE INDEX IF NOT EXISTS "FlowTrigger_isActive_idx" ON "FlowTrigger"("isActive");

-- Create FlowTriggerLog table to track trigger usage
CREATE TABLE IF NOT EXISTS "FlowTriggerLog" (
  "id" SERIAL PRIMARY KEY,
  "flowTriggerId" INTEGER NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "triggerWord" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "messageId" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowTriggerLog_flowTriggerId_fkey" FOREIGN KEY ("flowTriggerId") REFERENCES "FlowTrigger"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "FlowTriggerLog_flowTriggerId_idx" ON "FlowTriggerLog"("flowTriggerId");
CREATE INDEX IF NOT EXISTS "FlowTriggerLog_createdAt_idx" ON "FlowTriggerLog"("createdAt" DESC);
