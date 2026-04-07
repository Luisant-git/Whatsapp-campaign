const { PrismaClient } = require('@prisma/client-tenant');
const prisma = new PrismaClient();

async function checkTenants() {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      phoneNumberId: true,
      displayPhoneNumber: true
    }
  });

  console.log('\n📋 Registered Tenants:\n');
  if (tenants.length === 0) {
    console.log('⚠️  No tenants found!');
  } else {
    tenants.forEach(t => {
      console.log(`  Name: ${t.name}`);
      console.log(`  Phone Number ID: ${t.phoneNumberId}`);
      console.log(`  Display Phone: ${t.displayPhoneNumber}`);
      console.log(`  Tenant ID: ${t.id}`);
      console.log('');
    });
  }

  await prisma.$disconnect();
}

checkTenants().catch(console.error);
