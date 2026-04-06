const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { PrismaClient: TenantPrismaClient } = require('@prisma/client-tenant');

async function testMasterConfig() {
  // Connect to central database
  const centralPrisma = new CentralPrismaClient({
    datasources: {
      db: {
        url: process.env.CENTRAL_DATABASE_URL
      }
    }
  });

  try {
    console.log('\n🔍 Testing Master Config Setup...\n');

    // Get all active tenants
    const tenants = await centralPrisma.tenant.findMany({
      where: { isActive: true }
    });

    console.log(`Found ${tenants.length} active tenant(s)\n`);

    for (const tenant of tenants) {
      console.log(`\n📋 Tenant: ${tenant.email} (ID: ${tenant.id})`);
      console.log(`   Database: ${tenant.dbName}`);

      // Connect to tenant database
      const tenantDbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantPrisma = new TenantPrismaClient({
        datasources: {
          db: { url: tenantDbUrl }
        }
      });

      // Check Master Configs
      const masterConfigs = await tenantPrisma.masterConfig.findMany({
        select: {
          id: true,
          name: true,
          phoneNumberId: true,
          verifyToken: true,
          isActive: true,
          accessToken: true
        }
      });

      console.log(`\n   📱 Master Configs (${masterConfigs.length}):`);
      if (masterConfigs.length === 0) {
        console.log('      ❌ No Master Configs found');
      } else {
        masterConfigs.forEach(config => {
          console.log(`\n      Config: ${config.name}`);
          console.log(`      Phone Number ID: ${config.phoneNumberId}`);
          console.log(`      Verify Token: ${config.verifyToken}`);
          console.log(`      Access Token: ${config.accessToken ? config.accessToken.substring(0, 20) + '...' : '❌ NOT SET'}`);
          console.log(`      Active: ${config.isActive ? '✅' : '❌'}`);
          console.log(`      Webhook URL: https://whatsapp.luisant.cloud/whatsapp/webhook/${config.verifyToken}`);
        });
      }

      // Check Feature Assignments
      const featureAssignment = await tenantPrisma.featureAssignment.findFirst();
      
      console.log(`\n   🎯 Feature Assignments:`);
      if (!featureAssignment) {
        console.log('      ⚠️  No feature assignments configured');
      } else {
        console.log(`      WhatsApp Chat: ${featureAssignment.whatsappChat || 'Not assigned'}`);
        console.log(`      AI Chatbot: ${featureAssignment.aiChatbot || 'Not assigned'}`);
        console.log(`      Quick Reply: ${featureAssignment.quickReply || 'Not assigned'}`);
        console.log(`      Ecommerce: ${featureAssignment.ecommerce || 'Not assigned'}`);
        console.log(`      Campaigns: ${featureAssignment.campaigns || 'Not assigned'}`);
      }

      // Check WhatsApp Settings (fallback)
      const settings = await tenantPrisma.whatsAppSettings.findMany({
        select: {
          id: true,
          name: true,
          phoneNumberId: true,
          verifyToken: true,
          isDefault: true
        }
      });

      console.log(`\n   ⚙️  WhatsApp Settings (${settings.length}):`);
      if (settings.length === 0) {
        console.log('      ❌ No WhatsApp Settings found');
      } else {
        settings.forEach(setting => {
          console.log(`\n      Setting: ${setting.name}`);
          console.log(`      Phone Number ID: ${setting.phoneNumberId}`);
          console.log(`      Verify Token: ${setting.verifyToken || '❌ NOT SET'}`);
          console.log(`      Default: ${setting.isDefault ? '✅' : '❌'}`);
        });
      }

      await tenantPrisma.$disconnect();
    }

    console.log('\n\n✅ Test Complete!\n');
    console.log('📝 Summary:');
    console.log('   1. Make sure Master Config has:');
    console.log('      - Valid phoneNumberId');
    console.log('      - Valid accessToken');
    console.log('      - Valid verifyToken');
    console.log('      - isActive = true');
    console.log('   2. Set Feature Assignment to use Master Config phoneNumberId');
    console.log('   3. Use webhook URL: https://whatsapp.luisant.cloud/whatsapp/webhook/{verifyToken}');
    console.log('   4. In Meta Dashboard, set:');
    console.log('      - Callback URL: https://whatsapp.luisant.cloud/whatsapp/webhook/{verifyToken}');
    console.log('      - Verify Token: {verifyToken from Master Config}');
    console.log('');

    await centralPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await centralPrisma.$disconnect();
  }
}

testMasterConfig();
