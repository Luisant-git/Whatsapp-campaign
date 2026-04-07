const { PrismaClient } = require('@prisma/client-central');
const prisma = new PrismaClient();

async function checkTenants() {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumberId: true,
      phoneNumber: true,
      wabaId: true,
      isActive: true
    }
  });

  console.log('\n📋 Registered Tenants:\n');
  if (tenants.length === 0) {
    console.log('⚠️  No tenants found!');
  } else {
    tenants.forEach(t => {
      console.log(`  Name: ${t.name || 'N/A'}`);
      console.log(`  Email: ${t.email}`);
      console.log(`  Phone Number ID: ${t.phoneNumberId || 'NOT SET'}`);
      console.log(`  Phone Number: ${t.phoneNumber || 'N/A'}`);
      console.log(`  WABA ID: ${t.wabaId || 'NOT SET'}`);
      console.log(`  Tenant ID: ${t.id}`);
      console.log(`  Active: ${t.isActive ? 'Yes' : 'No'}`);
      console.log('');
    });
  }

  await prisma.$disconnect();
}

checkTenants().catch(console.error);
