const { PrismaClient } = require('@prisma/client-central');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CENTRAL_DATABASE_URL
    }
  }
});

async function updateTenantCredentials() {
  try {
    // Update the first tenant with WhatsApp credentials
    const result = await prisma.tenant.updateMany({
      data: {
        accessToken: process.env.META_ACCESS_TOKEN,
        wabaId: '24366060823054981',
        phoneNumberId: '803957376127788'
      }
    });

    console.log('Updated tenants:', result.count);
    console.log('WhatsApp credentials configured successfully!');
  } catch (error) {
    console.error('Error updating tenant credentials:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTenantCredentials();