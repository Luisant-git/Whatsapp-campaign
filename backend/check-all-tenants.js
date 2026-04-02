const { Client } = require('pg');

async function checkAllTenants() {
  let centralClient;
  
  try {
    console.log('🔍 Connecting to central database...');
    
    centralClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/whatsapp_campaign'
    });
    await centralClient.connect();
    console.log('✅ Connected to central database');

    // Get ALL tenants including inactive ones
    const allTenantsResult = await centralClient.query(`
      SELECT * FROM "Tenant" ORDER BY id
    `);
    
    console.log(`\n📋 ALL tenants in database (${allTenantsResult.rows.length} total):\n`);
    
    allTenantsResult.rows.forEach(tenant => {
      console.log(`🏢 Tenant ${tenant.id}:`);
      console.log(`   Name: ${tenant.name}`);
      console.log(`   Active: ${tenant.isActive}`);
      console.log(`   Email: ${tenant.email}`);
      console.log(`   Company: ${tenant.companyName || 'N/A'}`);
      console.log(`   Phone: ${tenant.phoneNumber || 'N/A'}`);
      console.log(`   Access Token: ${tenant.accessToken ? 'Present' : 'Missing'}`);
      console.log(`   Phone Number ID: ${tenant.phoneNumberId || 'Missing'}`);
      console.log(`   WABA ID: ${tenant.wabaId || 'Missing'}`);
      console.log('');
    });

    // Count active tenants
    const activeCount = allTenantsResult.rows.filter(t => t.isActive).length;
    console.log(`📊 Active tenants: ${activeCount}`);
    console.log(`📊 Inactive tenants: ${allTenantsResult.rows.length - activeCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (centralClient) await centralClient.end();
  }
}

checkAllTenants();