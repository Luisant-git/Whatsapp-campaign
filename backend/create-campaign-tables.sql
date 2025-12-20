-- Create Campaign table
CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "parameters" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create CampaignContact table
CREATE TABLE IF NOT EXISTS "CampaignContact" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignContact_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create CampaignMessage table
CREATE TABLE IF NOT EXISTS "CampaignMessage" (
    "id" SERIAL PRIMARY KEY,
    "messageId" TEXT,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "campaignId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "Campaign_userId_idx" ON "Campaign"("userId");
CREATE INDEX IF NOT EXISTS "CampaignContact_campaignId_idx" ON "CampaignContact"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignMessage_campaignId_idx" ON "CampaignMessage"("campaignId");