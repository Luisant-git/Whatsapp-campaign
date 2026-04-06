const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { PrismaClient: TenantPrismaClient } = require('@prisma/client-tenant');

async function fixFeatureAssignments() {
  const centralPrisma = new CentralPrismaClient({
    datasources: {
      db: {
        url: process.env.CENTRAL_DATABASE_URL
      }
    }
  });

  try {
    console.log('\n🔧 Fixing Feature Assignments...\n');

    const tenants = await centralPrisma.tenant.findMany({
      where: { isActive: true }
    });

    for (const tenant of tenants) {
      console.log(`\n📋 Processing Tenant: ${tenant.email} (ID: ${tenant.id})`);

      const tenantDbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantPrisma = new TenantPrismaClient({
        datasources: {
          db: { url: tenantDbUrl }
        }
      });

      // Get active Master Config
      const masterConfig = await tenantPrisma.masterConfig.findFirst({
        where: { isActive: true }
      });

      if (!masterConfig) {
        console.log('   ⚠️  No active Master Config found, skipping...');
        await tenantPrisma.$disconnect();
        continue;
      }

      console.log(`   ✅ Found Master Config: ${masterConfig.name} (${masterConfig.phoneNumberId})`);

      // Check existing feature assignment
      const existingAssignment = await tenantPrisma.featureAssignment.findFirst();

      if (existingAssignment) {
        console.log('   📝 Updating existing Feature Assignment...');
        await tenantPrisma.featureAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            whatsappChat: masterConfig.phoneNumberId,
            aiChatbot: masterConfig.phoneNumberId,
            quickReply: masterConfig.phoneNumberId,
            ecommerce: masterConfig.phoneNumberId,
            campaigns: masterConfig.phoneNumberId,
          }
        });
        console.log('   ✅ Feature Assignment updated!');
      } else {
        console.log('   📝 Creating new Feature Assignment...');
        await tenantPrisma.featureAssignment.create({
          data: {
            whatsappChat: masterConfig.phoneNumberId,
            aiChatbot: masterConfig.phoneNumberId,
            quickReply: masterConfig.phoneNumberId,
            ecommerce: masterConfig.phoneNumberId,
            campaigns: masterConfig.phoneNumberId,
          }
        });
        console.log('   ✅ Feature Assignment created!');
      }

      // Show final configuration
      const finalAssignment = await tenantPrisma.featureAssignment.findFirst();
      console.log('\n   🎯 Final Feature Assignments:');
      console.log(`      WhatsApp Chat: ${finalAssignment.whatsappChat}`);
      console.log(`      AI Chatbot: ${finalAssignment.aiChatbot}`);
      console.log(`      Quick Reply: ${finalAssignment.quickReply}`);
      console.log(`      Ecommerce: ${finalAssignment.ecommerce}`);
      console.log(`      Campaigns: ${finalAssignment.campaigns}`);

      await tenantPrisma.$disconnect();
    }

    console.log('\n\n✅ All Feature Assignments Fixed!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Restart your backend server: pm2 restart backend');
    console.log('   2. Test webhook by sending a message to your WhatsApp number');
    console.log('   3. Check logs: pm2 logs backend');
    console.log('');

    await centralPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await centralPrisma.$disconnect();
  }
}

fixFeatureAssignments();
