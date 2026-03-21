const { PrismaClient } = require('./backend/node_modules/@prisma/client-central');
const prisma = new PrismaClient();

async function fix() {
  console.log('🔧 Fixing chatbot permission for tenant ID 1...\n');
  
  const result = await prisma.menuPermission.update({
    where: { tenantId: 1 },
    data: {
      permission: {
        chatbot: true,
        contacts: true,
        campaigns: true,
        dashboard: true,
        quickReply: true,
        whatsappChat: true,
        chats: true,
        analytics: true
      }
    }
  });
  
  console.log('✅ Fixed! New permissions:');
  console.log(JSON.stringify(result.permission, null, 2));
  console.log('\n⚠️  IMPORTANT: User must LOGOUT and LOGIN again!');
  
  await prisma.$disconnect();
}

fix().catch(console.error);
