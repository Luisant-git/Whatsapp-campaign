-- Remove webhookCallbackUrl column from WhatsAppSettings table
-- This field is not needed as button callback URLs are configured directly in WhatsApp templates

ALTER TABLE "WhatsAppSettings" DROP COLUMN IF EXISTS "webhookCallbackUrl";
