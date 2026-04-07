const { PrismaClient } = require('@prisma/client-central');
const prisma = new PrismaClient();

async function checkTenantDb() {
  console.log('🔍 Checking Tenant Database Configuration...\n');

  const tenant = await prisma.tenant.findFirst({
    where: { phoneNumberId: '803957376127788' },
    select: {
      id: true,
      name: true,
      email: true,
      dbName: true,
      dbHost: true,
      dbPort: true,
      dbUser: true,
      phoneNumberId: true
    }
  });

  if (tenant) {
    console.log('✅ Found tenant with phoneNumberId 803957376127788:\n');
    console.log(`  Name: ${tenant.name}`);
    console.log(`  Email: ${tenant.email}`);
    console.log(`  Database Name: ${tenant.dbName}`);
    console.log(`  Database Host: ${tenant.dbHost}`);
    console.log(`  Database Port: ${tenant.dbPort}`);
    console.log(`  Database User: ${tenant.dbUser}`);
    console.log(`  Phone Number ID: ${tenant.phoneNumberId}`);
    
    console.log('\n📝 The backend should connect to:');
    console.log(`  postgresql://${tenant.dbUser}:****@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`);
  } else {
    console.log('❌ No tenant found with phoneNumberId 803957376127788');
  }

  await prisma.$disconnect();
}

checkTenantDb().catch(console.error);
