const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const result = await prisma.$queryRawUnsafe(`SELECT * FROM "MessageTemplate"`);
  console.log(JSON.stringify(result, null, 2));
}

run().finally(() => prisma.$disconnect());
