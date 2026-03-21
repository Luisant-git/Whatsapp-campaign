const { PrismaClient } = require('./backend/node_modules/@prisma/client-central');

// IMPORTANT: Update this with your PRODUCTION database URL
const PRODUCTION_DB_URL = 'postgresql://USER:PASSWORD@HOST:PORT/DATABASE';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: PRODUCTION_DB_URL
    }
  }
});

async function enableProductionChatbot() {
  try {
    console.log('🔍 Connecting to production database...\n');

    // Find all tenants
    const tenants = await prisma.tenant.findMany({
      include: {
        menuPermission: true,
        subscription: true
      }
    });

    console.log(`Found ${tenants.length} tenant(s):\n`);

    for (const tenant of tenants) {
      console.log(`📧 ${tenant.email} (ID: ${tenant.id})`);
      console.log(`   Plan: ${tenant.subscription?.name || 'N/A'}`);
      console.log(`   Chatbot enabled: ${tenant.menuPermission?.permission?.chatbot !== false}`);
      
      // Enable chatbot for ALL tenants
      await prisma.menuPermission.upsert({
        where: { tenantId: tenant.id },
        update: {
          permission: {
            ...(tenant.menuPermission?.permission || {}),
            chatbot: true
          }
        },
        create: {
          tenantId: tenant.id,
          permission: {
            dashboard: true,
            contacts: true,
            campaigns: true,
            chatbot: true,
            quickReply: true,
            whatsappChat: true
          }
        }
      });

      console.log(`   ✅ Chatbot enabled!\n`);
    }

    console.log('✅ All done! Chatbot enabled for all tenants.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n⚠️  Make sure to update PRODUCTION_DB_URL in this script!');
  } finally {
    await prisma.$disconnect();
  }
}

enableProductionChatbot();
