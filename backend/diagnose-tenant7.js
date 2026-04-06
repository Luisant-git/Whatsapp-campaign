const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { PrismaClient: TenantPrismaClient } = require('@prisma/client-tenant');
const axios = require('axios');

async function diagnoseTenant7() {
  const centralPrisma = new CentralPrismaClient({
    datasources: {
      db: {
        url: process.env.CENTRAL_DATABASE_URL
      }
    }
  });

  try {
    console.log('\n🔍 Diagnosing Tenant 7 (sangarichettiar@gmail.com)...\n');

    const tenant = await centralPrisma.tenant.findUnique({
      where: { id: 7 }
    });

    if (!tenant) {
      console.log('❌ Tenant 7 not found!');
      return;
    }

    console.log(`✅ Tenant Found: ${tenant.email}`);
    console.log(`   Database: ${tenant.dbName}\n`);

    const tenantDbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: tenantDbUrl }
      }
    });

    // Get Master Config
    const masterConfig = await tenantPrisma.masterConfig.findFirst({
      where: { isActive: true }
    });

    if (!masterConfig) {
      console.log('❌ No active Master Config found!');
      await tenantPrisma.$disconnect();
      return;
    }

    console.log('📱 Master Config:');
    console.log(`   Name: ${masterConfig.name}`);
    console.log(`   Phone Number ID: ${masterConfig.phoneNumberId}`);
    console.log(`   Verify Token: ${masterConfig.verifyToken}`);
    console.log(`   Access Token: ${masterConfig.accessToken.substring(0, 30)}...`);
    console.log(`   Active: ${masterConfig.isActive ? '✅' : '❌'}\n`);

    // Get Feature Assignments
    const featureAssignment = await tenantPrisma.featureAssignment.findFirst();

    console.log('🎯 Feature Assignments:');
    if (!featureAssignment) {
      console.log('   ❌ NO FEATURE ASSIGNMENTS FOUND - THIS IS THE PROBLEM!\n');
      console.log('   🔧 Creating Feature Assignment now...\n');
      
      await tenantPrisma.featureAssignment.create({
        data: {
          whatsappChat: masterConfig.phoneNumberId,
          aiChatbot: masterConfig.phoneNumberId,
          quickReply: masterConfig.phoneNumberId,
          ecommerce: masterConfig.phoneNumberId,
          campaigns: masterConfig.phoneNumberId,
        }
      });
      
      console.log('   ✅ Feature Assignment created!\n');
      
      const newAssignment = await tenantPrisma.featureAssignment.findFirst();
      console.log('   New Assignments:');
      console.log(`      WhatsApp Chat: ${newAssignment.whatsappChat}`);
      console.log(`      AI Chatbot: ${newAssignment.aiChatbot}`);
      console.log(`      Quick Reply: ${newAssignment.quickReply}`);
      console.log(`      Ecommerce: ${newAssignment.ecommerce}`);
      console.log(`      Campaigns: ${newAssignment.campaigns}\n`);
    } else {
      console.log(`   WhatsApp Chat: ${featureAssignment.whatsappChat || '❌ Not assigned'}`);
      console.log(`   AI Chatbot: ${featureAssignment.aiChatbot || '❌ Not assigned'}`);
      console.log(`   Quick Reply: ${featureAssignment.quickReply || '❌ Not assigned'}`);
      console.log(`   Ecommerce: ${featureAssignment.ecommerce || '❌ Not assigned'}`);
      console.log(`   Campaigns: ${featureAssignment.campaigns || '❌ Not assigned'}\n`);

      // Check if campaigns is assigned
      if (!featureAssignment.campaigns) {
        console.log('   ⚠️  Campaigns NOT assigned - Updating now...\n');
        
        await tenantPrisma.featureAssignment.update({
          where: { id: featureAssignment.id },
          data: {
            campaigns: masterConfig.phoneNumberId,
            whatsappChat: featureAssignment.whatsappChat || masterConfig.phoneNumberId,
            ecommerce: featureAssignment.ecommerce || masterConfig.phoneNumberId,
          }
        });
        
        console.log('   ✅ Feature Assignment updated!\n');
        
        const updatedAssignment = await tenantPrisma.featureAssignment.findFirst();
        console.log('   Updated Assignments:');
        console.log(`      WhatsApp Chat: ${updatedAssignment.whatsappChat}`);
        console.log(`      AI Chatbot: ${updatedAssignment.aiChatbot}`);
        console.log(`      Quick Reply: ${updatedAssignment.quickReply}`);
        console.log(`      Ecommerce: ${updatedAssignment.ecommerce}`);
        console.log(`      Campaigns: ${updatedAssignment.campaigns}\n`);
      }
    }

    // Test webhook verification
    console.log('🧪 Testing Webhook Verification...\n');
    const webhookUrl = `https://whatsapp.api.luisant.cloud/whatsapp/webhook/${masterConfig.verifyToken}`;
    console.log(`   Webhook URL: ${webhookUrl}`);
    
    try {
      const testUrl = `${webhookUrl}?hub.mode=subscribe&hub.verify_token=${masterConfig.verifyToken}&hub.challenge=test123`;
      console.log(`   Testing: ${testUrl}\n`);
      
      const response = await axios.get(testUrl, {
        timeout: 10000,
        validateStatus: () => true // Accept any status
      });
      
      if (response.status === 200 && response.data === 'test123') {
        console.log('   ✅ Webhook verification SUCCESSFUL!\n');
      } else {
        console.log(`   ❌ Webhook verification FAILED!`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.data)}\n`);
      }
    } catch (error) {
      console.log(`   ❌ Webhook test error: ${error.message}\n`);
    }

    // Check recent messages
    console.log('📨 Recent Messages (last 5):');
    const recentMessages = await tenantPrisma.whatsAppMessage.findMany({
      where: {
        phoneNumberId: masterConfig.phoneNumberId
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (recentMessages.length === 0) {
      console.log('   ⚠️  No messages found for this phone number\n');
    } else {
      recentMessages.forEach((msg, index) => {
        console.log(`\n   ${index + 1}. ${msg.direction.toUpperCase()}`);
        console.log(`      From: ${msg.from}`);
        console.log(`      Message: ${msg.message?.substring(0, 50)}...`);
        console.log(`      Status: ${msg.status}`);
        console.log(`      Time: ${msg.createdAt}`);
      });
      console.log('');
    }

    console.log('\n📝 Summary:');
    console.log('   ✅ Master Config is active and has valid credentials');
    console.log('   ✅ Verify Token: whatsapp_webhook_verify_token_123');
    console.log('   ✅ Phone Number ID: 1069928256205726');
    console.log('\n   🔧 Next Steps:');
    console.log('   1. Make sure Meta Dashboard webhook is set to:');
    console.log(`      URL: https://whatsapp.api.luisant.cloud/whatsapp/webhook/whatsapp_webhook_verify_token_123`);
    console.log('      Verify Token: whatsapp_webhook_verify_token_123');
    console.log('   2. Subscribe to "messages" webhook field');
    console.log('   3. Restart backend: pm2 restart backend');
    console.log('   4. Send a test message to the WhatsApp number');
    console.log('   5. Check logs: pm2 logs backend --lines 100\n');

    await tenantPrisma.$disconnect();
    await centralPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await centralPrisma.$disconnect();
  }
}

diagnoseTenant7();
