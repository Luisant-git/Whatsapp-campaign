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

async function checkPermissions() {
  try {
    console.log('🔍 Checking tenant ID 1 permissions...\n');

    const menuPermission = await prisma.menuPermission.findUnique({
      where: { tenantId: 1 },
      include: { tenant: true }
    });

    console.log('📧 Tenant:', menuPermission?.tenant?.email);
    console.log('🆔 Tenant ID:', menuPermission?.tenantId);
    console.log('📋 Full Permission Object:');
    console.log(JSON.stringify(menuPermission?.permission, null, 2));
    console.log('');
    console.log('🔍 Checking chatbot permission specifically:');
    console.log('   permissions.chatbot =', menuPermission?.permission?.chatbot);
    console.log('   permissions.hasOwnProperty("chatbot") =', menuPermission?.permission?.hasOwnProperty('chatbot'));
    console.log('   permissions.chatbot === false =', menuPermission?.permission?.chatbot === false);
    console.log('');
    
    const permissions = menuPermission?.permission;
    if (permissions && permissions.hasOwnProperty('chatbot') && permissions.chatbot === false) {
      console.log('❌ RESULT: Permission check FAILS - chatbot is explicitly set to false');
    } else {
      console.log('✅ RESULT: Permission check PASSES - chatbot should be allowed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();
