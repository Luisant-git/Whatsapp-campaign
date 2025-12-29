-- Add AutoReply table
CREATE TABLE "AutoReply" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "triggers" TEXT[],
    "response" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoReply_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "AutoReply" ADD CONSTRAINT "AutoReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;