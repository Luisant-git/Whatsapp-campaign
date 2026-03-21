// Load environment from backend/.env if exists
try {
  require('dotenv').config({ path: './backend/.env' });
} catch (e) {
  // dotenv not installed, will use existing env vars
}
const { PrismaClient } = require('./backend/node_modules/@prisma/client-central');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CENTRAL_DATABASE_URL
    }
  }
});

async function enableChatbotForAll() {
  try {
    console.log('🔍 Checking database connection...');
    console.log('📊 Database URL:', process.env.CENTRAL_DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'NOT SET');
    console.log('');

    // Find all tenants
    const tenants = await prisma.tenant.findMany({
      include: {
        menuPermission: true,
        subscription: true
      }
    });

    console.log(`✅ Found ${tenants.length} tenant(s):\n`);

    for (const tenant of tenants) {
      console.log(`📧 Email: ${tenant.email}`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Plan: ${tenant.subscription?.name || 'N/A'}`);
      console.log(`   Current chatbot status: ${tenant.menuPermission?.permission?.chatbot !== false ? '✅ Enabled' : '❌ Disabled'}`);
      
      // Enable chatbot
      const result = await prisma.menuPermission.upsert({
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
            whatsappChat: true,
            chats: true,
            analytics: true
          }
        }
      });

      console.log(`   ✅ Updated! Chatbot is now ENABLED`);
      console.log('');
    }

    console.log('🎉 All done! Chatbot enabled for all tenants.');
    console.log('');
    console.log('⚠️  IMPORTANT: Ask users to logout and login again to refresh their session!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Make sure you are running this on the production server');
    console.error('   2. Check that backend/.env has CENTRAL_DATABASE_URL set correctly');
    console.error('   3. Verify database is accessible from this server');
  } finally {
    await prisma.$disconnect();
  }
}

enableChatbotForAll();
