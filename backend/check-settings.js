const { Client } = require('pg');

async function checkSettings() {
  let centralClient;
  
  try {
    console.log('🔍 Connecting to central database...');
    
    centralClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/whatsapp_campaign'
    });
    await centralClient.connect();
    console.log('✅ Connected to central database');

    // Get all tables
    const tablesResult = await centralClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 All tables:');
    tablesResult.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // Check Tenant table structure
    const tenantColumns = await centralClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Tenant' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n🏢 Tenant table columns:');
    tenantColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Get tenant data with all columns
    const tenantsResult = await centralClient.query('SELECT * FROM "Tenant" ORDER BY id');
    console.log('\n📊 Tenant data:');
    tenantsResult.rows.forEach(tenant => {
      console.log(`\n   Tenant ${tenant.id} (${tenant.name}):`);
      Object.keys(tenant).forEach(key => {
        if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('token') || key.toLowerCase().includes('whatsapp')) {
          console.log(`     ${key}: ${tenant[key]}`);
        }
      });
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (centralClient) await centralClient.end();
  }
}

checkSettings();