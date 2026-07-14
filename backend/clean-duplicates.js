const { PrismaClient } = require('@prisma/client-tenant');
const prisma = new PrismaClient();

async function run() {
  console.log("Looking for duplicate contacts...");
  const contacts = await prisma.contact.findMany();
  const seen = new Set();
  const duplicates = [];

  for (const c of contacts) {
    if (seen.has(c.phone)) {
      duplicates.push(c.id);
    } else {
      seen.add(c.phone);
    }
  }

  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicates. Deleting duplicates keeping the originals...`);
    await prisma.contact.deleteMany({ where: { id: { in: duplicates } } });
    console.log("✅ Duplicates cleared!");
  } else {
    console.log("No duplicates found.");
  }
}

run().then(() => prisma.$disconnect()).catch((e) => {
  console.error(e);
  prisma.$disconnect();
});
