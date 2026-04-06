const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { PrismaClient: TenantPrismaClient } = require('@prisma/client-tenant');

async function monitorWebhook() {
  const centralPrisma = new CentralPrismaClient({
    datasources: {
      db: {
        url: process.env.CENTRAL_DATABASE_URL
      }
    }
  });

  try {
    console.log('\n📊 Webhook Monitor for Tenant 7\n');

    const tenant = await centralPrisma.tenant.findUnique({
      where: { id: 7 }
    });

    const tenantDbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: tenantDbUrl }
      }
    });

    // Get recent messages (last 10)
    console.log('📨 Recent Messages (last 10):');
    const messages = await tenantPrisma.whatsAppMessage.findMany({
      where: {
        phoneNumberId: '1069928256205726'
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (messages.length === 0) {
      console.log('   ⚠️  No messages found\n');
    } else {
      messages.forEach((msg, index) => {
        const time = new Date(msg.createdAt).toLocaleString();
        console.log(`\n   ${index + 1}. [${msg.direction.toUpperCase()}] ${time}`);
        console.log(`      From: ${msg.from}`);
        console.log(`      Message: ${msg.message?.substring(0, 50)}${msg.message?.length > 50 ? '...' : ''}`);
        console.log(`      Status: ${msg.status}`);
        console.log(`      Message ID: ${msg.messageId}`);
      });
    }

    console.log('\n\n🔍 Checking for INCOMING messages in last 24 hours:');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const incomingMessages = await tenantPrisma.whatsAppMessage.findMany({
      where: {
        phoneNumberId: '1069928256205726',
        direction: 'incoming',
        createdAt: {
          gte: yesterday
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`   Found ${incomingMessages.length} incoming messages in last 24 hours\n`);

    if (incomingMessages.length > 0) {
      console.log('   Recent incoming messages:');
      incomingMessages.slice(0, 5).forEach((msg, index) => {
        const time = new Date(msg.createdAt).toLocaleString();
        console.log(`   ${index + 1}. ${time} - From: ${msg.from} - "${msg.message?.substring(0, 30)}"`);
      });
    }

    console.log('\n\n📝 Instructions to Test:');
    console.log('   1. Send a WhatsApp message to: +91 90922 83255');
    console.log('   2. Wait 5 seconds');
    console.log('   3. Run this script again: node monitor-webhook.js');
    console.log('   4. Check if a new INCOMING message appears\n');

    console.log('📊 Meta Configuration:');
    console.log('   ✅ Webhook URL: https://whatsapp.api.luisant.cloud/whatsapp/webhook');
    console.log('   ✅ Phone Number: +91 90922 83255');
    console.log('   ✅ Phone Number ID: 1069928256205726');
    console.log('   ✅ Quality Rating: GREEN\n');

    console.log('🔧 If messages still not coming:');
    console.log('   1. Check Meta Dashboard > WhatsApp > Configuration > Webhook');
    console.log('   2. Make sure "messages" field is subscribed');
    console.log('   3. Try clicking "Test" button in Meta Dashboard');
    console.log('   4. Check PM2 logs: pm2 logs backend --lines 100\n');

    await tenantPrisma.$disconnect();
    await centralPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await centralPrisma.$disconnect();
  }
}

monitorWebhook();
