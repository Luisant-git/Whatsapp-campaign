require('dotenv').config();
const { PrismaClient } = require('@prisma/client-central');

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        // This will use the CENTRAL_DATABASE_URL from your .env file
        url: process.env.CENTRAL_DATABASE_URL
      }
    }
  });

  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        email: true,
        companyName: true,
        phoneNumberId: true,
        dbName: true,
        isActive: true
      }
    });

    console.log('\n=== LIST OF ALL TENANTS ===');
    console.table(tenants);
    console.log('===========================\n');
  } catch (error) {
    console.error('Error fetching tenants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
