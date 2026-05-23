const axios = require('axios');

async function testMetaLeadsSync() {
  console.log('\n=== Testing Meta Leads Sync Endpoint ===\n');

  const testData = {
    pageId: 'test-page-123',
    formId: 'test-form-456',
    accessToken: 'test-token'
  };

  try {
    const response = await axios.post(
      'https://whatsapp.api.luisant.cloud/meta-leads/sync',
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'your-tenant-email@example.com', // Replace with actual tenant email
          'Origin': 'https://whatsapp.luisant.cloud'
        },
        validateStatus: () => true
      }
    );

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.data.error) {
      console.log('\n❌ Error occurred');
      if (response.data.message.includes('Tenant context not found')) {
        console.log('\n🔍 The x-tenant-id header is not being processed correctly');
        console.log('   Make sure the tenant middleware is applied to /meta-leads routes');
      } else if (response.data.message.includes('Response from the Engine was empty')) {
        console.log('\n🔍 Database connection issue detected');
        console.log('   Run: node test-db-connection.js');
      }
    }

  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

testMetaLeadsSync();
