const { Client } = require('pg');
require('dotenv').config();

async function verifyCredentials() {
  const centralClient = new Client({
    connectionString: process.env.CENTRAL_DATABASE_URL
  });

  const metaCredentials = {
    phoneNumberId: '992606057280238',
    wabaId: '2996303170556649',
    appId: '1983839335719624',
    accessToken: 'EAAbTPTEHFxEBRn0EWnQQS1mqPJ3xjpBv6cLmEmY0Rci39jgZCwg7Fa9qmDfHtbWHfOoNRS5tPrXDfF8q3KRNZAvm3oyr55VkWZAqb4trfZCmh5tHt5ZCGrmRYPHWNUfadmlTTx7XE9kSYH6cZCAVNxdZAtmEgZBjO5ydZA2d3W5XswEfnpib5F6nu66XA9F2mJQZDZD',
    verifyToken: 'whatsapp_webhook_verify_token_123'
  };

  try {
    await centralClient.connect();
    console.log('\n=== VERIFYING META CREDENTIALS ===\n');

    // Get all active tenants
    const tenantsResult = await centralClient.query(
      'SELECT id, "dbUser", "dbPassword", "dbHost", "dbPort", "dbName" FROM "Tenant" WHERE "isActive" = true'
    );

    console.log(`Checking ${tenantsResult.rows.length} active tenant(s)...\n`);

    let foundMatch = false;
    let needsUpdate = false;
    const updateCommands = [];

    for (const tenant of tenantsResult.rows) {
      console.log(`--- Tenant ID: ${tenant.id} ---`);
      
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
          'SELECT id, name, "phoneNumberId", "accessToken", "verifyToken" FROM "WhatsAppSettings"'
        );

        console.log(`\nWhatsApp Settings (${settingsResult.rows.length}):`);
        settingsResult.rows.forEach(s => {
          console.log(`\n  Settings ID: ${s.id} - ${s.name}`);
          console.log(`  Phone Number ID: ${s.phoneNumberId}`);
          
          if (s.phoneNumberId === metaCredentials.phoneNumberId) {
            console.log(`  ✅ Phone Number ID MATCHES!`);
            foundMatch = true;
            
            // Check other fields
            if (s.accessToken !== metaCredentials.accessToken) {
              console.log(`  ⚠️  Access Token MISMATCH`);
              needsUpdate = true;
              updateCommands.push(`-- Tenant ${tenant.id}, Settings ${s.id}`);
              updateCommands.push(`UPDATE "WhatsAppSettings" SET "accessToken" = '${metaCredentials.accessToken}' WHERE id = ${s.id};`);
            } else {
              console.log(`  ✅ Access Token matches`);
            }
            
            if (s.verifyToken !== metaCredentials.verifyToken) {
              console.log(`  ⚠️  Verify Token MISMATCH`);
              console.log(`     DB: ${s.verifyToken}`);
              console.log(`     Meta: ${metaCredentials.verifyToken}`);
              needsUpdate = true;
              updateCommands.push(`UPDATE "WhatsAppSettings" SET "verifyToken" = '${metaCredentials.verifyToken}' WHERE id = ${s.id};`);
            } else {
              console.log(`  ✅ Verify Token matches`);
            }
          } else {
            console.log(`  ❌ Phone Number ID: ${s.phoneNumberId} (doesn't match Meta)`);
          }
        });

        // Check MasterConfig
        const masterConfigResult = await tenantClient.query(
          'SELECT id, name, "phoneNumberId", "accessToken", "verifyToken", "isActive" FROM "MasterConfig"'
        );

        console.log(`\nMaster Configs (${masterConfigResult.rows.length}):`);
        masterConfigResult.rows.forEach(mc => {
          console.log(`\n  MasterConfig ID: ${mc.id} - ${mc.name} (Active: ${mc.isActive})`);
          console.log(`  Phone Number ID: ${mc.phoneNumberId}`);
          
          if (mc.phoneNumberId === metaCredentials.phoneNumberId) {
            console.log(`  ✅ Phone Number ID MATCHES!`);
            foundMatch = true;
            
            if (mc.accessToken !== metaCredentials.accessToken) {
              console.log(`  ⚠️  Access Token MISMATCH`);
              needsUpdate = true;
              updateCommands.push(`-- Tenant ${tenant.id}, MasterConfig ${mc.id}`);
              updateCommands.push(`UPDATE "MasterConfig" SET "accessToken" = '${metaCredentials.accessToken}' WHERE id = ${mc.id};`);
            } else {
              console.log(`  ✅ Access Token matches`);
            }
            
            if (mc.verifyToken !== metaCredentials.verifyToken) {
              console.log(`  ⚠️  Verify Token MISMATCH`);
              console.log(`     DB: ${mc.verifyToken}`);
              console.log(`     Meta: ${metaCredentials.verifyToken}`);
              needsUpdate = true;
              updateCommands.push(`UPDATE "MasterConfig" SET "verifyToken" = '${metaCredentials.verifyToken}' WHERE id = ${mc.id};`);
            } else {
              console.log(`  ✅ Verify Token matches`);
            }
            
            if (!mc.isActive) {
              console.log(`  ⚠️  MasterConfig is INACTIVE`);
              updateCommands.push(`UPDATE "MasterConfig" SET "isActive" = true WHERE id = ${mc.id};`);
            }
          } else {
            console.log(`  ❌ Phone Number ID: ${mc.phoneNumberId} (doesn't match Meta)`);
          }
        });

        // Check PhoneNumberMapping
        const mappingResult = await centralClient.query(
          'SELECT * FROM "PhoneNumberMapping" WHERE "phoneNumberId" = $1',
          [metaCredentials.phoneNumberId]
        );

        if (mappingResult.rows.length === 0) {
          console.log(`\n  ⚠️  No PhoneNumberMapping found for ${metaCredentials.phoneNumberId}`);
          console.log(`  Creating mapping for tenant ${tenant.id}...`);
          updateCommands.push(`-- Create PhoneNumberMapping in CENTRAL database`);
          updateCommands.push(`INSERT INTO "PhoneNumberMapping" ("phoneNumberId", "tenantId", "createdAt", "updatedAt") VALUES ('${metaCredentials.phoneNumberId}', ${tenant.id}, NOW(), NOW()) ON CONFLICT ("phoneNumberId") DO UPDATE SET "tenantId" = ${tenant.id}, "updatedAt" = NOW();`);
        } else {
          console.log(`\n  ✅ PhoneNumberMapping exists for tenant ${mappingResult.rows[0].tenantId}`);
        }

      } finally {
        await tenantClient.end();
      }
    }

    console.log('\n\n=== SUMMARY ===\n');
    
    if (!foundMatch) {
      console.log('❌ Phone Number ID 992606057280238 NOT FOUND in any database!');
      console.log('\nYou need to add this phone number to your system:');
      console.log('1. Go to your admin panel');
      console.log('2. Add a new WhatsApp Settings or MasterConfig');
      console.log('3. Use the credentials provided above');
    } else if (needsUpdate) {
      console.log('⚠️  Found matching Phone Number ID but some credentials need updating\n');
      console.log('=== UPDATE COMMANDS ===\n');
      updateCommands.forEach(cmd => console.log(cmd));
      console.log('\nRun these SQL commands to update your database.');
    } else {
      console.log('✅ All credentials match! Your database is correctly configured.');
      console.log('\nWebhook should work with these settings:');
      console.log('  URL: https://whatsapp.api.luisant.cloud/whatsapp/webhook');
      console.log('  Token: whatsapp_webhook_verify_token_123');
    }

    console.log('\n=== NEXT STEPS ===');
    console.log('1. If updates are needed, run the SQL commands above');
    console.log('2. Restart your backend server: pm2 restart whatsapp-backend');
    console.log('3. Try webhook verification in Meta Console again');
    console.log('4. Monitor logs: pm2 logs whatsapp-backend');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await centralClient.end();
  }
}

verifyCredentials();
