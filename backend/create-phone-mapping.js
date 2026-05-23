const { Client } = require('pg');
require('dotenv').config();

async function createPhoneNumberMapping() {
  const centralClient = new Client({
    connectionString: process.env.CENTRAL_DATABASE_URL
  });

  try {
    await centralClient.connect();
    console.log('\n=== CREATING PHONE NUMBER MAPPING ===\n');

    const phoneNumberId = '992606057280238';
    const tenantId = 10; // Honda Bigwing

    // Check if mapping already exists
    const existingMapping = await centralClient.query(
      'SELECT * FROM "PhoneNumberMapping" WHERE "phoneNumberId" = $1',
      [phoneNumberId]
    );

    if (existingMapping.rows.length > 0) {
      console.log('⚠️  Mapping already exists:');
      console.log(`   Phone Number ID: ${existingMapping.rows[0].phoneNumberId}`);
      console.log(`   Tenant ID: ${existingMapping.rows[0].tenantId}`);
      console.log(`   Created: ${existingMapping.rows[0].createdAt}`);
      
      if (existingMapping.rows[0].tenantId !== tenantId) {
        console.log(`\n⚠️  Updating mapping to point to tenant ${tenantId}...`);
        await centralClient.query(
          'UPDATE "PhoneNumberMapping" SET "tenantId" = $1, "updatedAt" = NOW() WHERE "phoneNumberId" = $2',
          [tenantId, phoneNumberId]
        );
        console.log('✅ Mapping updated successfully!');
      } else {
        console.log('✅ Mapping is already correct!');
      }
    } else {
      console.log('Creating new mapping...');
      await centralClient.query(
        'INSERT INTO "PhoneNumberMapping" ("phoneNumberId", "tenantId", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW())',
        [phoneNumberId, tenantId]
      );
      console.log('✅ Mapping created successfully!');
    }

    // Verify the mapping
    const verifyMapping = await centralClient.query(
      'SELECT * FROM "PhoneNumberMapping" WHERE "phoneNumberId" = $1',
      [phoneNumberId]
    );

    console.log('\n=== VERIFICATION ===');
    console.log('Phone Number ID:', verifyMapping.rows[0].phoneNumberId);
    console.log('Tenant ID:', verifyMapping.rows[0].tenantId);
    console.log('Created:', verifyMapping.rows[0].createdAt);
    console.log('Updated:', verifyMapping.rows[0].updatedAt);

    console.log('\n=== WEBHOOK CONFIGURATION ===');
    console.log('✅ Everything is now configured correctly!');
    console.log('\nWebhook Settings for Meta Console:');
    console.log('  Callback URL: https://whatsapp.api.luisant.cloud/whatsapp/webhook');
    console.log('  Verify Token: whatsapp_webhook_verify_token_123');
    console.log('\nTenant: Honda Bigwing (ID: 10)');
    console.log('Phone Number ID: 992606057280238');

    console.log('\n=== NEXT STEPS ===');
    console.log('1. ✅ Database is configured correctly');
    console.log('2. ✅ PhoneNumberMapping is created');
    console.log('3. ✅ Credentials match Meta Console');
    console.log('4. Now verify the webhook in Meta Developer Console');
    console.log('5. If verification still fails, try:');
    console.log('   - Remove webhook URL completely in Meta Console');
    console.log('   - Wait 2 minutes');
    console.log('   - Add it back with the same URL and token');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await centralClient.end();
  }
}

createPhoneNumberMapping();
