-- Shopping Session Table for Meta Catalog Orders
CREATE TABLE IF NOT EXISTS "ShoppingSession" (
    "id" SERIAL PRIMARY KEY,
    "phone" VARCHAR(20) UNIQUE NOT NULL,
    "currentProductId" INTEGER,
    "paymentMethod" VARCHAR(50),
    "step" VARCHAR(50) NOT NULL DEFAULT 'browsing',
    "customerName" TEXT,
    "customerAddress" TEXT,
    "customerCity" VARCHAR(100),
    "customerPincode" VARCHAR(10),
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast phone lookup
CREATE INDEX IF NOT EXISTS "ShoppingSession_phone_idx" ON "ShoppingSession"("phone");

-- Index for cleanup old sessions
CREATE INDEX IF NOT EXISTS "ShoppingSession_updatedAt_idx" ON "ShoppingSession"("updatedAt");
