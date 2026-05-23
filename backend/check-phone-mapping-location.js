const { Client } = require('pg');
require('dotenv').config();

async function checkPhoneNumberMappingTable() {
  console.log('\n=== CHECKING PhoneNumberMapping TABLE LOCATION ===\n');

  // Check Central Database
  console.log('1. Checking CENTRAL database...');
  const centralClient = new Client({
    connectionString: process.env.CENTRAL_DATABASE_URL
  });

  try {
    await centralClient.connect();
    
    const centralCheck = await centralClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'PhoneNumberMapping'
      );
    `);

    if (centralCheck.rows[0].exists) {
      console.log('   ✅ PhoneNumberMapping table EXISTS in CENTRAL database');
      
      // Show existing mappings
      const mappings = await centralClient.query('SELECT * FROM "PhoneNumberMapping"');
      console.log(`   Found ${mappings.rows.length} existing mapping(s):`);
      mappings.rows.forEach(m => {
        console.log(`     - Phone: ${m.phoneNumberId} -> Tenant: ${m.tenantId}`);
      });
    } else {
      console.log('   ❌ PhoneNumberMapping table NOT FOUND in CENTRAL database');
    }

  } catch (error) {
    console.log('   ❌ Error:', error.message);
  } finally {
    await centralClient.end();
  }

  // Check Tenant Database
  console.log('\n2. Checking TENANT database (tenant_db)...');
  const tenantClient = new Client({
    connectionString: process.env.TENANT_DATABASE_URL
  });

  try {
    await tenantClient.connect();
    
    const tenantCheck = await tenantClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'PhoneNumberMapping'
      );
    `);

    if (tenantCheck.rows[0].exists) {
      console.log('   ✅ PhoneNumberMapping table EXISTS in TENANT database');
      
      const mappings = await tenantClient.query('SELECT * FROM "PhoneNumberMapping"');
      console.log(`   Found ${mappings.rows.length} existing mapping(s):`);
      mappings.rows.forEach(m => {
        console.log(`     - Phone: ${m.phoneNumberId} -> Tenant: ${m.tenantId}`);
      });
    } else {
      console.log('   ❌ PhoneNumberMapping table NOT FOUND in TENANT database');
    }

  } catch (error) {
    console.log('   ❌ Error:', error.message);
  } finally {
    await tenantClient.end();
  }

  console.log('\n=== EXPLANATION ===');
  console.log('PhoneNumberMapping should be in the CENTRAL database because:');
  console.log('- It maps phone numbers to specific tenants');
  console.log('- The webhook needs to know which tenant to route messages to');
  console.log('- This is a cross-tenant lookup table');
  console.log('\nThe tenant databases contain:');
  console.log('- WhatsAppSettings (tenant-specific configurations)');
  console.log('- MasterConfig (tenant-specific phone credentials)');
  console.log('- Messages, Contacts, Campaigns (tenant-specific data)');
}

checkPhoneNumberMappingTable();
