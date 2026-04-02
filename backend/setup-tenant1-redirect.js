const { Client } = require('pg');

async function setupTenant1Redirect() {
  let centralClient;
  
  try {
    console.log('🔍 Setting up Tenant 2 → Tenant 1 redirect...');
    centralClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/whatsapp_central'
    });
    await centralClient.connect();

    console.log('\n🔧 STEP 1: Complete Tenant 1 settings');
    console.log('UPDATE "Tenant" SET "phoneNumberId" = \'803957376127788\' WHERE id = 1;');

    console.log('\n🔧 STEP 2: Add this code to your WhatsApp flow handler:');
    console.log('```javascript');
    console.log('// In your flow processing code');
    console.log('function getSettingsTenantId(flowTenantId) {');
    console.log('  const tenantRedirects = {');
    console.log('    2: 1  // Redirect Tenant 2 flows to use Tenant 1 settings');
    console.log('  };');
    console.log('  return tenantRedirects[flowTenantId] || flowTenantId;');
    console.log('}');
    console.log('');
    console.log('// When processing flow response:');
    console.log('const flowTenantId = extractTenantFromFlowToken(flowToken); // Gets 2');
    console.log('const settingsTenantId = getSettingsTenantId(flowTenantId);   // Returns 1');
    console.log('');
    console.log('// Use settingsTenantId (1) to get WhatsApp settings');
    console.log('const whatsappSettings = await getTenantSettings(settingsTenantId);');
    console.log('```');

    console.log('\n🔧 STEP 3: Or modify your database query directly:');
    console.log('```javascript');
    console.log('// Instead of:');
    console.log('// const tenant = await getTenant(extractedTenantId);');
    console.log('');
    console.log('// Use:');
    console.log('const actualTenantId = extractedTenantId === 2 ? 1 : extractedTenantId;');
    console.log('const tenant = await getTenant(actualTenantId);');
    console.log('```');

    console.log('\n✅ RESULT:');
    console.log('- User books through Tenant 2 flow (flow_xxx_2_xxx)');
    console.log('- System detects Tenant 2 from flow token');
    console.log('- Code redirects to use Tenant 1 settings');
    console.log('- Confirmation sent using Tenant 1 WhatsApp credentials');

    // Execute Step 1 automatically
    console.log('\n🚀 Executing Step 1 (Complete Tenant 1)...');
    await centralClient.query('UPDATE "Tenant" SET "phoneNumberId" = \'803957376127788\' WHERE id = 1');
    console.log('✅ Tenant 1 settings completed!');

    // Verify
    const tenant1 = await centralClient.query('SELECT "accessToken", "phoneNumberId", "wabaId" FROM "Tenant" WHERE id = 1');
    const t1 = tenant1.rows[0];
    console.log('\n📊 Tenant 1 now has:');
    console.log(`   Access Token: ${t1.accessToken ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Phone Number ID: ${t1.phoneNumberId ? '✅ Present' : '❌ Missing'}`);
    console.log(`   WABA ID: ${t1.wabaId ? '✅ Present' : '❌ Missing'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (centralClient) await centralClient.end();
  }
}

setupTenant1Redirect();