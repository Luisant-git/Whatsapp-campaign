-- Add feature assignments table
CREATE TABLE IF NOT EXISTS "FeatureAssignment" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "whatsappChat" TEXT,
    "aiChatbot" TEXT,
    "quickReply" TEXT,
    "ecommerce" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeatureAssignment_userId_key" UNIQUE ("userId")
);
