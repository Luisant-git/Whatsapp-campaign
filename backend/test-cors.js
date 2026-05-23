const axios = require('axios');

async function testCORS() {
  console.log('\n=== TESTING CORS HEADERS ===\n');

  try {
    // Test OPTIONS request (preflight)
    const response = await axios({
      method: 'OPTIONS',
      url: 'https://whatsapp.api.luisant.cloud/meta-config',
      headers: {
        'Origin': 'https://whatsapp.luisant.cloud',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-tenant-id'
      },
      validateStatus: () => true
    });

    console.log('Status:', response.status);
    console.log('\nCORS Headers:');
    console.log('  Access-Control-Allow-Origin:', response.headers['access-control-allow-origin']);
    console.log('  Access-Control-Allow-Methods:', response.headers['access-control-allow-methods']);
    console.log('  Access-Control-Allow-Headers:', response.headers['access-control-allow-headers']);
    console.log('  Access-Control-Allow-Credentials:', response.headers['access-control-allow-credentials']);

    const allowedHeaders = response.headers['access-control-allow-headers'];
    if (allowedHeaders && allowedHeaders.toLowerCase().includes('x-tenant-id')) {
      console.log('\n✅ x-tenant-id is allowed!');
    } else {
      console.log('\n❌ x-tenant-id is NOT allowed');
      console.log('Allowed headers:', allowedHeaders);
      console.log('\n⚠️  Backend needs restart or nginx config needs update');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCORS();
