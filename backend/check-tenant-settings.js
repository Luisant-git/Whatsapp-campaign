const { Client } = require('pg');

async function checkTenantSettings() {
  let centralClient;
  
  try {
    console.log('🔍 Connecting to central database...');
    
    centralClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/whatsapp_campaign'
    });
    await centralClient.connect();
    console.log('✅ Connected to central database');

    // Get all tenants with WhatsApp settings
    const tenantsResult = await centralClient.query(`
      SELECT id, name, "isActive", "accessToken", "phoneNumberId", "wabaId"
      FROM "Tenant" 
      ORDER BY id
    `);
    
    console.log(`\n📋 Found ${tenantsResult.rows.length} tenants:\n`);
    
    tenantsResult.rows.forEach(tenant => {
      const hasAccessToken = !!tenant.accessToken;
      const hasPhoneNumberId = !!tenant.phoneNumberId;
      const hasWabaId = !!tenant.wabaId;
      const hasCompleteSettings = hasAccessToken && hasPhoneNumberId && hasWabaId;
      
      console.log(`🏢 Tenant ${tenant.id} (${tenant.name}):`);
      console.log(`   Active: ${tenant.isActive}`);
      console.log(`   Access Token: ${hasAccessToken ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Phone Number ID: ${hasPhoneNumberId ? '✅ Present' : '❌ Missing'}`);
      console.log(`   WABA ID: ${hasWabaId ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Complete Settings: ${hasCompleteSettings ? '✅ YES' : '❌ NO'}`);
      
      if (hasPhoneNumberId) {
        console.log(`   Phone Number ID Value: ${tenant.phoneNumberId}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (centralClient) await centralClient.end();
  }
}

checkTenantSettings();