const { PrismaClient } = require('@prisma/client');

async function checkAndSetVerifyToken() {
  const centralPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.CENTRAL_DATABASE_URL
      }
    }
  });

  try {
    console.log('\n=== CHECKING VERIFY TOKEN CONFIGURATION ===\n');

    // Get all active tenants
    const tenants = await centralPrisma.tenant.findMany({
      where: { isActive: true }
    });

    console.log(`Found ${tenants.length} active tenant(s)\n`);

    const desiredToken = 'whatsapp_webhook_verify_token_123';

    for (const tenant of tenants) {
      console.log(`\n--- Tenant ID: ${tenant.id} ---`);
      
      // Connect to tenant database
      const tenantDbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantPrisma = new PrismaClient({
        datasources: {
          db: { url: tenantDbUrl }
        }
      });

      try {
        // Check WhatsAppSettings
        const settings = await tenantPrisma.whatsAppSettings.findMany({
          select: {
            id: true,
            name: true,
            phoneNumberId: true,
            verifyToken: true
          }
        });

        console.log(`\nWhatsApp Settings (${settings.length}):`);
        settings.forEach(s => {
          console.log(`  - ID: ${s.id}`);
          console.log(`    Name: ${s.name}`);
          console.log(`    Phone Number ID: ${s.phoneNumberId}`);
          console.log(`    Verify Token: ${s.verifyToken || '(NOT SET)'}`);
          
          if (s.verifyToken !== desiredToken) {
            console.log(`    ⚠️  Token mismatch! Expected: ${desiredToken}`);
          } else {
            console.log(`    ✅ Token matches!`);
          }
        });

        // Check MasterConfig
        const masterConfigs = await tenantPrisma.masterConfig.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            phoneNumberId: true,
            verifyToken: true
          }
        });

        console.log(`\nMaster Configs (${masterConfigs.length}):`);
        masterConfigs.forEach(mc => {
          console.log(`  - ID: ${mc.id}`);
          console.log(`    Name: ${mc.name}`);
          console.log(`    Phone Number ID: ${mc.phoneNumberId}`);
          console.log(`    Verify Token: ${mc.verifyToken || '(NOT SET)'}`);
          
          if (mc.verifyToken !== desiredToken) {
            console.log(`    ⚠️  Token mismatch! Expected: ${desiredToken}`);
          } else {
            console.log(`    ✅ Token matches!`);
          }
        });

        // Offer to update
        console.log(`\n--- UPDATE COMMANDS FOR TENANT ${tenant.id} ---`);
        
        if (settings.length > 0) {
          console.log('\nTo update WhatsAppSettings:');
          settings.forEach(s => {
            console.log(`UPDATE "WhatsAppSettings" SET "verifyToken" = '${desiredToken}' WHERE id = ${s.id};`);
          });
        }

        if (masterConfigs.length > 0) {
          console.log('\nTo update MasterConfig:');
          masterConfigs.forEach(mc => {
            console.log(`UPDATE "MasterConfig" SET "verifyToken" = '${desiredToken}' WHERE id = ${mc.id};`);
          });
        }

      } finally {
        await tenantPrisma.$disconnect();
      }
    }

    console.log('\n\n=== SUMMARY ===');
    console.log(`Expected verify token: ${desiredToken}`);
    console.log(`\nThis token should match what you enter in Meta Developer Console.`);
    console.log(`\nIf tokens don't match, run the UPDATE commands shown above.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await centralPrisma.$disconnect();
  }
}

checkAndSetVerifyToken();
