const { Client } = require('pg');

async function redirectTenantFlow() {
  let centralClient;
  
  try {
    console.log('🔍 Connecting to central database...');
    centralClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/whatsapp_central'
    });
    await centralClient.connect();
    console.log('✅ Connected to central database');

    // Check current settings
    const tenantsResult = await centralClient.query(`
      SELECT id, name, "accessToken", "phoneNumberId", "wabaId", "isActive"
      FROM "Tenant" WHERE id IN (1, 2) ORDER BY id
    `);
    
    console.log('\n📊 Current Settings:');
    tenantsResult.rows.forEach(tenant => {
      const hasComplete = tenant.accessToken && tenant.phoneNumberId && tenant.wabaId;
      console.log(`\n🏢 Tenant ${tenant.id} (${tenant.name}):`);
      console.log(`   Complete Settings: ${hasComplete ? '✅ YES' : '❌ NO'}`);
      console.log(`   Access Token: ${tenant.accessToken ? 'Present' : 'Missing'}`);
      console.log(`   Phone Number ID: ${tenant.phoneNumberId || 'Missing'}`);
      console.log(`   WABA ID: ${tenant.wabaId || 'Missing'}`);
    });

    console.log('\n💡 OPTIONS TO REDIRECT TENANT 2 FLOWS TO TENANT 1:');
    console.log('\n🔧 Option 1: Copy Tenant 1 settings to Tenant 2');
    console.log('UPDATE "Tenant" SET');
    console.log('  "accessToken" = (SELECT "accessToken" FROM "Tenant" WHERE id = 1),');
    console.log('  "wabaId" = (SELECT "wabaId" FROM "Tenant" WHERE id = 1)');
    console.log('WHERE id = 2;');

    console.log('\n🔧 Option 2: Create tenant mapping in your application');
    console.log('// In your flow processing code:');
    console.log('const tenantMapping = {');
    console.log('  2: 1, // Redirect Tenant 2 flows to use Tenant 1 settings');
    console.log('};');
    console.log('const actualTenantId = tenantMapping[extractedTenantId] || extractedTenantId;');

    console.log('\n🔧 Option 3: Modify flow token generation');
    console.log('// When generating flow tokens for Tenant 2, use Tenant 1 ID:');
    console.log('const flowToken = `flow_${timestamp}_1_${randomString}`; // Use 1 instead of 2');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (centralClient) await centralClient.end();
  }
}

redirectTenantFlow();