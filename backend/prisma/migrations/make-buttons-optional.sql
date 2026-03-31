-- Make buttons field optional in QuickReply table
ALTER TABLE "QuickReply" ALTER COLUMN "buttons" DROP NOT NULL;
