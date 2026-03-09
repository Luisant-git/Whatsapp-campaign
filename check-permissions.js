const { PrismaClient } = require('./backend/node_modules/@prisma/client-central');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CENTRAL_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/whatsapp_central'
    }
  }
});

async function checkTenantPermissions() {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: 1 },
      include: {
        subscription: true,
        menuPermission: true
      }
    });

    console.log('Tenant 1 data:');
    console.log('- Individual menuPermission:', JSON.stringify(tenant?.menuPermission?.permission, null, 2));
    console.log('- Subscription plan:', tenant?.subscription?.name);
    console.log('- Plan menuPermissions:', tenant?.subscription?.menuPermissions);
    
    // Check what the logic would return
    if (tenant?.menuPermission) {
      const individualResult = tenant.menuPermission.permission?.['chatbot'] !== false;
      console.log('- Individual permission result:', individualResult);
    } else if (tenant?.subscription?.menuPermissions) {
      const planResult = tenant.subscription.menuPermissions.includes('chatbot');
      console.log('- Plan permission result:', planResult);
    } else {
      console.log('- Default result: true (no restrictions)');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenantPermissions();