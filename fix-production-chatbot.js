const { PrismaClient } = require('./backend/node_modules/@prisma/client-central');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CENTRAL_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/whatsapp_central'
    }
  }
});

async function fixProductionChatbot() {
  try {
    // Find the user by email
    const user = await prisma.tenant.findFirst({
      where: { email: 'user@example.com' },
      include: {
        menuPermission: true,
        subscription: true
      }
    });

    if (!user) {
      console.log('❌ User user@example.com not found');
      return;
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`   Tenant ID: ${user.id}`);
    console.log(`   Plan: ${user.subscription?.name || 'N/A'}`);
    console.log(`   Current permissions:`, JSON.stringify(user.menuPermission?.permission, null, 2));

    // Enable chatbot for this user
    const result = await prisma.menuPermission.upsert({
      where: { tenantId: user.id },
      update: {
        permission: {
          ...(user.menuPermission?.permission || {}),
          chatbot: true  // Enable chatbot
        }
      },
      create: {
        tenantId: user.id,
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

    console.log('\n✅ Chatbot enabled successfully!');
    console.log('   Updated permissions:', JSON.stringify(result.permission, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductionChatbot();
