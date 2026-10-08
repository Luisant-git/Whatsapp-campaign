-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('CUSTOMER_META', 'COMPANY_ASSISTED', 'PLATFORM_CREDIT');

-- CreateEnum
CREATE TYPE "MetaBillingStatus" AS ENUM ('UNKNOWN', 'ACTIVE', 'PENDING_PAYMENT', 'DISABLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "MetaConnection" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "businessPortfolioId" TEXT,
    "wabaId" TEXT NOT NULL,
    "connectionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "onboardingStatus" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaCredential" (
    "id" SERIAL NOT NULL,
    "connectionId" INTEGER NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'SYSTEM_USER',
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaPhoneNumber" (
    "id" SERIAL NOT NULL,
    "connectionId" INTEGER NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "displayNumber" TEXT,
    "verifiedName" TEXT,
    "qualityRating" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaPhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAccount" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "billingMode" "BillingMode" NOT NULL DEFAULT 'CUSTOMER_META',
    "metaBillingStatus" "MetaBillingStatus" NOT NULL DEFAULT 'UNKNOWN',
    "saasPlanId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" SERIAL NOT NULL,
    "billingAccountId" INTEGER NOT NULL,
    "balancePaise" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" SERIAL NOT NULL,
    "walletId" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaConnection_tenantId_wabaId_key" ON "MetaConnection"("tenantId", "wabaId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaCredential_connectionId_key" ON "MetaCredential"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaPhoneNumber_connectionId_phoneNumberId_key" ON "MetaPhoneNumber"("connectionId", "phoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingAccount_tenantId_key" ON "BillingAccount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_billingAccountId_key" ON "Wallet"("billingAccountId");

-- AddForeignKey
ALTER TABLE "MetaConnection" ADD CONSTRAINT "MetaConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaCredential" ADD CONSTRAINT "MetaCredential_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "MetaConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaPhoneNumber" ADD CONSTRAINT "MetaPhoneNumber_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "MetaConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
