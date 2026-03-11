const { PrismaClient } = require('./backend/node_modules/@prisma/client-central');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CENTRAL_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/whatsapp_central'
    }
  }
});

async function disableChatbot() {
  try {
    // Upsert tenant 1's chatbot permission to false
    const result = await prisma.menuPermission.upsert({
      where: { tenantId: 1 },
      update: {
        permission: {
          dashboard: true,
          contacts: true,
          campaigns: true,
          chatbot: false,  // Disable chatbot
          quickReply: true,
          whatsappChat: true
        }
      },
      create: {
        tenantId: 1,
        permission: {
          dashboard: true,
          contacts: true,
          campaigns: true,
          chatbot: false,  // Disable chatbot
          quickReply: true,
          whatsappChat: true
        }
      }
    });

    console.log('Chatbot disabled for tenant 1:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

disableChatbot();