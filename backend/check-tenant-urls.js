const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');

async function checkTenantUrls() {
  const centralPrisma = new CentralPrismaClient();

  try {
    const tenants = await centralPrisma.tenant.findMany({
      where: { isActive: true },
    });

    console.log('Tenant Database URLs:\n');
    tenants.forEach(tenant => {
      console.log(`Tenant: ${tenant.name}`);
      console.log(`Domain: ${tenant.domain || 'no domain'}`);
      console.log(`Database URL: ${tenant.databaseUrl}`);
      console.log('---\n');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await centralPrisma.$disconnect();
  }
}

checkTenantUrls();
