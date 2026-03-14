const { PrismaClient } = require('./backend/node_modules/@prisma/client-central');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CENTRAL_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/whatsapp_central'
    }
  }
});

async function checkPermissions() {
  try {
    // Get all menu permissions to see the structure
    const permissions = await prisma.menuPermission.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            email: true,
            companyName: true
          }
        }
      }
    });

    console.log('All Menu Permissions:');
    permissions.forEach(perm => {
      console.log(`\nTenant: ${perm.tenant.email} (ID: ${perm.tenantId})`);
      console.log('Permissions:', JSON.stringify(perm.permission, null, 2));
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();