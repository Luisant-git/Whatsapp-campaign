const { Client } = require('pg');

async function copyWhatsAppSettings() {
  let centralClient, tenant6Client, tenant2Client;
  
  try {
    console.log('🔍 Starting WhatsApp settings copy process...');
    
    // Connect to central database
    centralClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/whatsapp_campaign'
    });
    await centralClient.connect();
    console.log('✅ Connected to central database');

    // Get tenant details
    const tenantsResult = await centralClient.query(
      'SELECT id, name, "dbName", "dbHost", "dbPort", "dbUser", "dbPassword" FROM "Tenant" WHERE id IN (2, 6)'
    );
    
    const tenants = tenantsResult.rows;
    const tenant6 = tenants.find(t => t.id === 6);
    const tenant2 = tenants.find(t => t.id === 2);
    
    if (!tenant6) {
      console.error('❌ Tenant 6 (SNP) not found');
      return;
    }
    
    if (!tenant2) {
      console.error('❌ Tenant 2 (company) not found');
      return;
    }

    console.log(`📋 Source: Tenant 6 - ${tenant6.name} (${tenant6.dbName})`);
    console.log(`📋 Target: Tenant 2 - ${tenant2.name} (${tenant2.dbName})`);

    // Connect to tenant 6 database
    tenant6Client = new Client({
      host: tenant6.dbHost,
      port: tenant6.dbPort,
      database: tenant6.dbName,
      user: tenant6.dbUser,
      password: tenant6.dbPassword
    });
    await tenant6Client.connect();
    console.log('✅ Connected to tenant 6 database');

    // Connect to tenant 2 database
    tenant2Client = new Client({
      host: tenant2.dbHost,
      port: tenant2.dbPort,
      database: tenant2.dbName,
      user: tenant2.dbUser,
      password: tenant2.dbPassword
    });
    await tenant2Client.connect();
    console.log('✅ Connected to tenant 2 database');

    // Get settings from tenant 6
    console.log('🔍 Getting WhatsApp settings from tenant 6...');
    const sourceResult = await tenant6Client.query('SELECT * FROM "WhatsAppSettings" LIMIT 1');
    
    if (sourceResult.rows.length === 0) {
      console.error('❌ No WhatsApp settings found in tenant 6');
      return;
    }

    const sourceSettings = sourceResult.rows[0];
    console.log('✅ Found settings in tenant 6:');
    console.log(`   Name: ${sourceSettings.name}`);
    console.log(`   Phone Number ID: ${sourceSettings.phoneNumberId}`);
    console.log(`   Template: ${sourceSettings.templateName}`);

    // Check if tenant 2 already has settings
    const existingResult = await tenant2Client.query('SELECT * FROM "WhatsAppSettings"');
    
    if (existingResult.rows.length > 0) {
      console.log('⚠️ Tenant 2 already has WhatsApp settings. Updating...');
      
      // Update existing settings
      await tenant2Client.query(`
        UPDATE "WhatsAppSettings" 
        SET 
          "name" = $1,
          "templateName" = $2,
          "phoneNumberId" = $3,
          "accessToken" = $4,
          "verifyToken" = $5,
          "apiUrl" = $6,
          "language" = $7,
          "headerImageUrl" = $8,
          "confirmationTemplate" = $9,
          "isDefault" = $10,
          "updatedAt" = NOW()
        WHERE id = $11
      `, [
        'Company Settings',
        sourceSettings.templateName,
        sourceSettings.phoneNumberId,
        sourceSettings.accessToken,
        sourceSettings.verifyToken,
        sourceSettings.apiUrl,
        sourceSettings.language,
        sourceSettings.headerImageUrl,
        sourceSettings.confirmationTemplate || 'enquiry_received_1',
        true,
        existingResult.rows[0].id
      ]);
      
      console.log('✅ Updated WhatsApp settings in tenant 2');
    } else {
      console.log('📝 Creating new WhatsApp settings in tenant 2...');
      
      // Create new settings
      await tenant2Client.query(`
        INSERT INTO "WhatsAppSettings" (
          "name", "templateName", "phoneNumberId", "accessToken", "verifyToken",
          "apiUrl", "language", "headerImageUrl", "confirmationTemplate", 
          "isDefault", "masterConfigId", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      `, [
        'Company Settings',
        sourceSettings.templateName,
        sourceSettings.phoneNumberId,
        sourceSettings.accessToken,
        sourceSettings.verifyToken,
        sourceSettings.apiUrl,
        sourceSettings.language,
        sourceSettings.headerImageUrl,
        sourceSettings.confirmationTemplate || 'enquiry_received_1',
        true,
        sourceSettings.masterConfigId
      ]);
      
      console.log('✅ Created WhatsApp settings in tenant 2');
    }

    // Verify the copy
    const verifyResult = await tenant2Client.query('SELECT * FROM "WhatsAppSettings" LIMIT 1');
    const copiedSettings = verifyResult.rows[0];
    
    console.log('\n🔍 Verification - Settings in tenant 2:');
    console.log(`   Name: ${copiedSettings.name}`);
    console.log(`   Phone Number ID: ${copiedSettings.phoneNumberId}`);
    console.log(`   Template: ${copiedSettings.templateName}`);
    console.log(`   Confirmation Template: ${copiedSettings.confirmationTemplate}`);
    console.log(`   Is Default: ${copiedSettings.isDefault}`);
    
    console.log('\n✅ WhatsApp settings successfully copied from tenant 6 to tenant 2!');
    console.log('🎯 Flow appointments will now save to tenant 2 and send confirmations properly.');

  } catch (error) {
    console.error('❌ Error copying WhatsApp settings:', error.message);
  } finally {
    // Cleanup connections
    if (centralClient) await centralClient.end();
    if (tenant6Client) await tenant6Client.end();
    if (tenant2Client) await tenant2Client.end();
  }
}

// Run the script
copyWhatsAppSettings();