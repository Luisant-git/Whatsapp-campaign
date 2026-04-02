const { Client } = require('pg');

async function combineAndRedirect() {
  let centralClient;
  
  try {
    console.log('🔍 Connecting to central database...');
    centralClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/whatsapp_central'
    });
    await centralClient.connect();
    console.log('✅ Connected to central database');

    console.log('🔧 STEP 1: Make Tenant 1 complete by adding missing phoneNumberId');
    console.log('Execute this SQL:');
    console.log('```sql');
    console.log('UPDATE "Tenant" SET');
    console.log('  "phoneNumberId" = (SELECT "phoneNumberId" FROM "Tenant" WHERE id = 2)');
    console.log('WHERE id = 1;');
    console.log('```');

    console.log('\n🔧 STEP 2: Copy complete settings from Tenant 1 to Tenant 2');
    console.log('Execute this SQL:');
    console.log('```sql');
    console.log('UPDATE "Tenant" SET');
    console.log('  "accessToken" = (SELECT "accessToken" FROM "Tenant" WHERE id = 1),');
    console.log('  "wabaId" = (SELECT "wabaId" FROM "Tenant" WHERE id = 1)');
    console.log('WHERE id = 2;');
    console.log('```');

    console.log('\n🚀 ALTERNATIVE: Execute both steps at once');
    console.log('```sql');
    console.log('-- Step 1: Complete Tenant 1');
    console.log('UPDATE "Tenant" SET "phoneNumberId" = \'803957376127788\' WHERE id = 1;');
    console.log('');
    console.log('-- Step 2: Complete Tenant 2');
    console.log('UPDATE "Tenant" SET');
    console.log('  "accessToken" = (SELECT "accessToken" FROM "Tenant" WHERE id = 1),');
    console.log('  "wabaId" = \'24366060823054981\'');
    console.log('WHERE id = 2;');
    console.log('```');

    console.log('\n✅ After running these commands:');
    console.log('- Both tenants will have complete WhatsApp settings');
    console.log('- Tenant 2 flows will work without falling back to Tenant 6');
    console.log('- No code changes needed!');

    // Offer to execute automatically
    console.log('\n💡 Want me to execute these updates automatically? (y/n)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (centralClient) await centralClient.end();
  }
}

combineAndRedirect();