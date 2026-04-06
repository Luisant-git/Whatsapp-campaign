const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { PrismaClient: TenantPrismaClient } = require('@prisma/client-tenant');

async function updateTenant7Features() {
  const centralPrisma = new CentralPrismaClient({
    datasources: {
      db: {
        url: process.env.CENTRAL_DATABASE_URL
      }
    }
  });

  try {
    console.log('\n🔧 Updating Feature Assignments for Tenant 7...\n');

    const tenant = await centralPrisma.tenant.findUnique({
      where: { id: 7 }
    });

    if (!tenant) {
      console.log('❌ Tenant 7 not found!');
      return;
    }

    const tenantDbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: tenantDbUrl }
      }
    });

    const masterConfig = await tenantPrisma.masterConfig.findFirst({
      where: { isActive: true }
    });

    if (!masterConfig) {
      console.log('❌ No active Master Config found!');
      return;
    }

    console.log(`✅ Master Config: ${masterConfig.name} (${masterConfig.phoneNumberId})\n`);

    const existingAssignment = await tenantPrisma.featureAssignment.findFirst();

    if (existingAssignment) {
      console.log('📝 Current Feature Assignments:');
      console.log(`   WhatsApp Chat: ${existingAssignment.whatsappChat || 'Not assigned'}`);
      console.log(`   AI Chatbot: ${existingAssignment.aiChatbot || 'Not assigned'}`);
      console.log(`   Quick Reply: ${existingAssignment.quickReply || 'Not assigned'}`);
      console.log(`   Ecommerce: ${existingAssignment.ecommerce || 'Not assigned'}`);
      console.log(`   Campaigns: ${existingAssignment.campaigns || 'Not assigned'}\n`);

      console.log('🔄 Updating to allow incoming messages...\n');

      // Update: Assign to quickReply (which processes incoming messages)
      // Remove from campaigns-only
      await tenantPrisma.featureAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          whatsappChat: masterConfig.phoneNumberId,
          aiChatbot: masterConfig.phoneNumberId,
          quickReply: masterConfig.phoneNumberId,
          ecommerce: masterConfig.phoneNumberId,
          campaigns: null, // Remove campaigns assignment to allow incoming messages
        }
      });

      console.log('✅ Feature Assignment updated!\n');

      const updatedAssignment = await tenantPrisma.featureAssignment.findFirst();
      console.log('📝 New Feature Assignments:');
      console.log(`   WhatsApp Chat: ${updatedAssignment.whatsappChat}`);
      console.log(`   AI Chatbot: ${updatedAssignment.aiChatbot}`);
      console.log(`   Quick Reply: ${updatedAssignment.quickReply}`);
      console.log(`   Ecommerce: ${updatedAssignment.ecommerce}`);
      console.log(`   Campaigns: ${updatedAssignment.campaigns || 'Not assigned (allows incoming messages)'}\n`);
    }

    console.log('✅ Done!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Restart backend: pm2 restart backend');
    console.log('   2. Send a test WhatsApp message');
    console.log('   3. Check logs: pm2 logs backend\n');

    await tenantPrisma.$disconnect();
    await centralPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await centralPrisma.$disconnect();
  }
}

updateTenant7Features();
