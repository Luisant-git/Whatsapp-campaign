const { Client } = require('pg');

async function fixTenantSettings() {
  let centralClient;
  
  try {
    console.log('🔍 Connecting to central database...');
    centralClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/whatsapp_central'
    });
    await centralClient.connect();
    console.log('✅ Connected to central database');

    // Check current tenant 2 settings
    const tenant2Result = await centralClient.query('SELECT * FROM "Tenant" WHERE id = 2');
    if (tenant2Result.rows.length > 0) {
      const tenant2 = tenant2Result.rows[0];
      console.log('\n🏢 Current Tenant 2 (company) settings:');
      console.log(`   Access Token: ${tenant2.accessToken || 'MISSING'}`);
      console.log(`   Phone Number ID: ${tenant2.phoneNumberId || 'MISSING'}`);
      console.log(`   WABA ID: ${tenant2.wabaId || 'MISSING'}`);
    }

    // Check tenant 6 settings (the one that works)
    const tenant6Result = await centralClient.query('SELECT * FROM "Tenant" WHERE id = 6');
    if (tenant6Result.rows.length > 0) {
      const tenant6 = tenant6Result.rows[0];
      console.log('\n🏢 Current Tenant 6 (SNP) settings:');
      console.log(`   Access Token: ${tenant6.accessToken || 'MISSING'}`);
      console.log(`   Phone Number ID: ${tenant6.phoneNumberId || 'MISSING'}`);
      console.log(`   WABA ID: ${tenant6.wabaId || 'MISSING'}`);
    }

    console.log('\n💡 SOLUTION: To fix tenant 2, you need to update its WhatsApp settings.');
    console.log('Based on your log, tenant 6 is working with phone number ID: 950716588134446');
    console.log('\nRun this SQL to fix tenant 2:');
    console.log('```sql');
    console.log('UPDATE "Tenant" SET');
    console.log('  "accessToken" = \'YOUR_ACCESS_TOKEN_HERE\',');
    console.log('  "phoneNumberId" = \'950716588134446\',');
    console.log('  "wabaId" = \'YOUR_WABA_ID_HERE\'');
    console.log('WHERE id = 2;');
    console.log('```');

    console.log('\n🔍 Or copy settings from tenant 1 (Naveen) who has some settings:');
    const tenant1Result = await centralClient.query('SELECT * FROM "Tenant" WHERE id = 1');
    if (tenant1Result.rows.length > 0) {
      const tenant1 = tenant1Result.rows[0];
      console.log('```sql');
      console.log('UPDATE "Tenant" SET');
      console.log(`  "accessToken" = '${tenant1.accessToken}',`);
      console.log(`  "phoneNumberId" = '${tenant2Result.rows[0].phoneNumberId}',`);
      console.log(`  "wabaId" = '${tenant1.wabaId}'`);
      console.log('WHERE id = 2;');
      console.log('```');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (centralClient) await centralClient.end();
  }
}

fixTenantSettings();