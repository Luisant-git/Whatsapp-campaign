const { Client } = require('pg');
require('dotenv').config();

async function checkVerifyToken() {
  const centralClient = new Client({
    connectionString: process.env.CENTRAL_DATABASE_URL
  });

  try {
    await centralClient.connect();
    console.log('\n=== CHECKING VERIFY TOKEN CONFIGURATION ===\n');

    // Get all active tenants
    const tenantsResult = await centralClient.query(
      'SELECT id, "dbUser", "dbPassword", "dbHost", "dbPort", "dbName" FROM "Tenant" WHERE "isActive" = true'
    );

    console.log(`Found ${tenantsResult.rows.length} active tenant(s)\n`);

    const desiredToken = 'whatsapp_webhook_verify_token_123';

    for (const tenant of tenantsResult.rows) {
      console.log(`\n--- Tenant ID: ${tenant.id} ---`);
      
      // Connect to tenant database
      const tenantClient = new Client({
        user: tenant.dbUser,
        password: tenant.dbPassword,
        host: tenant.dbHost,
        port: tenant.dbPort,
        database: tenant.dbName
      });

      try {
        await tenantClient.connect();

        // Check WhatsAppSettings
        const settingsResult = await tenantClient.query(
          'SELECT id, name, "phoneNumberId", "verifyToken" FROM "WhatsAppSettings"'
        );

        console.log(`\nWhatsApp Settings (${settingsResult.rows.length}):`);
        settingsResult.rows.forEach(s => {
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
        const masterConfigResult = await tenantClient.query(
          'SELECT id, name, "phoneNumberId", "verifyToken" FROM "MasterConfig" WHERE "isActive" = true'
        );

        console.log(`\nMaster Configs (${masterConfigResult.rows.length}):`);
        masterConfigResult.rows.forEach(mc => {
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

        // Show update commands
        console.log(`\n--- UPDATE COMMANDS FOR TENANT ${tenant.id} ---`);
        
        if (settingsResult.rows.length > 0) {
          console.log('\nTo update WhatsAppSettings, run:');
          settingsResult.rows.forEach(s => {
            console.log(`UPDATE "WhatsAppSettings" SET "verifyToken" = '${desiredToken}' WHERE id = ${s.id};`);
          });
        }

        if (masterConfigResult.rows.length > 0) {
          console.log('\nTo update MasterConfig, run:');
          masterConfigResult.rows.forEach(mc => {
            console.log(`UPDATE "MasterConfig" SET "verifyToken" = '${desiredToken}' WHERE id = ${mc.id};`);
          });
        }

      } finally {
        await tenantClient.end();
      }
    }

    console.log('\n\n=== SUMMARY ===');
    console.log(`Expected verify token in Meta Console: ${desiredToken}`);
    console.log(`Webhook URL: https://whatsapp.api.luisant.cloud/whatsapp/webhook`);
    console.log(`\nIf tokens don't match, copy and run the UPDATE commands shown above in your database.`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await centralClient.end();
  }
}

checkVerifyToken();
