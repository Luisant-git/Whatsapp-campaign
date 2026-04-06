const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { PrismaClient: TenantPrismaClient } = require('@prisma/client-tenant');
const axios = require('axios');

async function comprehensiveDiagnostic() {
  const centralPrisma = new CentralPrismaClient({
    datasources: {
      db: {
        url: process.env.CENTRAL_DATABASE_URL
      }
    }
  });

  try {
    console.log('\n🔍 COMPREHENSIVE WEBHOOK DIAGNOSTIC\n');
    console.log('='.repeat(50));

    const tenant = await centralPrisma.tenant.findUnique({
      where: { id: 7 }
    });

    const tenantDbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: tenantDbUrl }
      }
    });

    // 1. Check Master Config
    console.log('\n1️⃣ MASTER CONFIG CHECK:');
    const masterConfig = await tenantPrisma.masterConfig.findFirst({
      where: { isActive: true }
    });
    
    if (masterConfig) {
      console.log(`   ✅ Name: ${masterConfig.name}`);
      console.log(`   ✅ Phone Number ID: ${masterConfig.phoneNumberId}`);
      console.log(`   ✅ Verify Token: ${masterConfig.verifyToken}`);
      console.log(`   ✅ Access Token: ${masterConfig.accessToken.substring(0, 30)}...`);
    } else {
      console.log('   ❌ No active Master Config found!');
    }

    // 2. Check Feature Assignments
    console.log('\n2️⃣ FEATURE ASSIGNMENTS:');
    const featureAssignment = await tenantPrisma.featureAssignment.findFirst();
    
    if (featureAssignment) {
      console.log(`   WhatsApp Chat: ${featureAssignment.whatsappChat || '❌ Not assigned'}`);
      console.log(`   AI Chatbot: ${featureAssignment.aiChatbot || '❌ Not assigned'}`);
      console.log(`   Quick Reply: ${featureAssignment.quickReply || '❌ Not assigned'}`);
      console.log(`   Ecommerce: ${featureAssignment.ecommerce || '❌ Not assigned'}`);
      console.log(`   Campaigns: ${featureAssignment.campaigns || '✅ Not assigned (allows incoming)'}`);
    } else {
      console.log('   ⚠️  No feature assignments');
    }

    // 3. Test Webhook Endpoint
    console.log('\n3️⃣ WEBHOOK ENDPOINT TEST:');
    try {
      const testResponse = await axios.get(
        'https://whatsapp.api.luisant.cloud/whatsapp/webhook',
        {
          params: {
            'hub.mode': 'subscribe',
            'hub.verify_token': masterConfig.verifyToken,
            'hub.challenge': 'test12345'
          },
          timeout: 5000
        }
      );
      
      if (testResponse.data === 'test12345') {
        console.log('   ✅ Webhook verification: WORKING');
      } else {
        console.log('   ❌ Webhook verification: FAILED');
        console.log(`   Response: ${testResponse.data}`);
      }
    } catch (error) {
      console.log('   ❌ Webhook endpoint error:', error.message);
    }

    // 4. Check Recent Messages
    console.log('\n4️⃣ RECENT MESSAGES (Last 5):');
    const recentMessages = await tenantPrisma.whatsAppMessage.findMany({
      where: {
        phoneNumberId: masterConfig.phoneNumberId
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (recentMessages.length === 0) {
      console.log('   ⚠️  No messages found');
    } else {
      recentMessages.forEach((msg, index) => {
        const time = new Date(msg.createdAt);
        const now = new Date();
        const diffMinutes = Math.floor((now - time) / 1000 / 60);
        
        console.log(`\n   ${index + 1}. [${msg.direction.toUpperCase()}] ${diffMinutes} minutes ago`);
        console.log(`      From: ${msg.from}`);
        console.log(`      Message: ${msg.message?.substring(0, 40)}...`);
        console.log(`      Message ID: ${msg.messageId.substring(0, 30)}...`);
      });
    }

    // 5. Check for Real WhatsApp Message IDs
    console.log('\n5️⃣ REAL MESSAGE CHECK:');
    const realMessages = await tenantPrisma.whatsAppMessage.findMany({
      where: {
        phoneNumberId: masterConfig.phoneNumberId,
        messageId: {
          startsWith: 'wamid.'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    if (realMessages.length > 0) {
      console.log(`   ✅ Found ${realMessages.length} real WhatsApp messages`);
      realMessages.forEach((msg, index) => {
        const time = new Date(msg.createdAt).toLocaleString();
        console.log(`   ${index + 1}. ${time} - ${msg.direction} - From: ${msg.from}`);
      });
    } else {
      console.log('   ⚠️  No real WhatsApp messages found (only test messages)');
      console.log('   This means Meta is NOT sending webhooks for real messages');
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n📊 DIAGNOSIS:\n');

    if (realMessages.length > 0) {
      console.log('✅ Webhooks ARE working! Real messages are being received.\n');
    } else {
      console.log('❌ Webhooks NOT working! Meta is not sending real messages.\n');
      console.log('🔧 SOLUTION:\n');
      console.log('1. Go to Meta Dashboard: https://developers.facebook.com/apps');
      console.log('2. Select your app');
      console.log('3. WhatsApp > Configuration');
      console.log('4. Check "Webhook fields" section');
      console.log('5. Verify "messages" field shows: ☑ messages (checked)');
      console.log('6. If checked but still not working:');
      console.log('   - Click "Unsubscribe" next to messages');
      console.log('   - Wait 5 seconds');
      console.log('   - Click "Subscribe" again');
      console.log('   - Send a test message\n');
      console.log('7. Alternative: Check if your phone number is in "Test Mode"');
      console.log('   - Go to WhatsApp > API Setup');
      console.log('   - Check if phone number is in production or test mode');
      console.log('   - Test mode only receives messages from verified test numbers\n');
    }

    console.log('📝 NEXT STEPS:\n');
    console.log('1. Send a WhatsApp message to: +91 90922 83255');
    console.log('2. Wait 10 seconds');
    console.log('3. Run: node comprehensive-diagnostic.js');
    console.log('4. Check if a new message with "wamid." appears\n');

    await tenantPrisma.$disconnect();
    await centralPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await centralPrisma.$disconnect();
  }
}

comprehensiveDiagnostic();
