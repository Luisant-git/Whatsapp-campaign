CREATE TABLE "MetaVolumeTierLog" (
    "id" SERIAL NOT NULL,
    "wabaId" TEXT NOT NULL,
    "pricingCategory" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "effectiveMonth" TEXT NOT NULL,
    "region" TEXT,
    "tierUpdateTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetaVolumeTierLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MetaVolumeTierLog_wabaId_pricingCategory_effectiveMonth_tier_key" ON "MetaVolumeTierLog"("wabaId", "pricingCategory", "effectiveMonth", "tierUpdateTime");
CREATE INDEX "MetaVolumeTierLog_wabaId_effectiveMonth_idx" ON "MetaVolumeTierLog"("wabaId", "effectiveMonth");
