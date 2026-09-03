const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const result = await prisma.$queryRawUnsafe(`SELECT * FROM "WhatsAppMessage" ORDER BY "createdAt" DESC LIMIT 5`);
  console.log(JSON.stringify(result, null, 2));
}

run().finally(() => prisma.$disconnect());
