-- Add MetaCatalogConfig table to tenant databases
CREATE TABLE IF NOT EXISTS "MetaCatalogConfig" (
    "id" SERIAL PRIMARY KEY,
    "catalogId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
