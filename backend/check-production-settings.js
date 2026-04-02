const { Client } = require('pg');

async function checkProductionSettings() {
  let centralClient, tenantClient;
  
  try {
    // Connect to central database
    console.log('🔍 Connecting to central database...');
    centralClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/whatsapp_central'
    });
    await centralClient.connect();
    console.log('✅ Connected to central database');

    // Get all tables in central DB
    const centralTables = await centralClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    
    console.log('\n📋 Central DB tables:');
    centralTables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // Check if Tenant table exists in central DB
    try {
      const tenantsResult = await centralClient.query('SELECT * FROM "Tenant" ORDER BY id');
      console.log(`\n🏢 Found ${tenantsResult.rows.length} tenants in central DB:`);
      tenantsResult.rows.forEach(tenant => {
        console.log(`   ID: ${tenant.id} | Name: ${tenant.name} | Active: ${tenant.isActive}`);
        console.log(`   Access Token: ${tenant.accessToken ? 'Present' : 'Missing'}`);
        console.log(`   Phone Number ID: ${tenant.phoneNumberId || 'Missing'}`);
        console.log(`   WABA ID: ${tenant.wabaId || 'Missing'}`);
        console.log('');
      });
    } catch (error) {
      console.log('\n❌ Tenant table not found in central DB:', error.message);
    }

    // Connect to tenant database
    console.log('\n🔍 Connecting to tenant database...');
    tenantClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/tenant_db'
    });
    await tenantClient.connect();
    console.log('✅ Connected to tenant database');

    // Check WhatsAppSettings table
    try {
      const whatsappSettings = await tenantClient.query('SELECT * FROM "WhatsAppSettings" ORDER BY id');
      console.log(`\n📱 WhatsApp Settings (${whatsappSettings.rows.length} records):`);
      whatsappSettings.rows.forEach(setting => {
        console.log(`   ID: ${setting.id}`);
        Object.keys(setting).forEach(key => {
          if (key !== 'id') {
            console.log(`   ${key}: ${setting[key]}`);
          }
        });
        console.log('');
      });
    } catch (error) {
      console.log('\n❌ Error reading WhatsAppSettings:', error.message);
    }

    // Check MasterConfig table
    try {
      const masterConfig = await tenantClient.query('SELECT * FROM "MasterConfig" ORDER BY id');
      console.log(`\n🔧 Master Config (${masterConfig.rows.length} records):`);
      masterConfig.rows.forEach(config => {
        console.log(`   ID: ${config.id} | Key: ${config.key} | Value: ${config.value}`);
      });
    } catch (error) {
      console.log('\n❌ Error reading MasterConfig:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (centralClient) await centralClient.end();
    if (tenantClient) await tenantClient.end();
  }
}

checkProductionSettings();