-- AlterTable: add optional scheduledDate column for one-time scheduled campaigns
ALTER TABLE "Campaign" ADD COLUMN "scheduledDate" TIMESTAMP(3);
