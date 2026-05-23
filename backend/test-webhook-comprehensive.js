const axios = require('axios');

async function testWebhookEndpoint() {
  console.log('\n=== COMPREHENSIVE WEBHOOK TEST ===\n');

  const baseUrl = 'https://whatsapp.api.luisant.cloud';
  const verifyToken = 'whatsapp_webhook_verify_token_123';

  // Test 1: Check if server is accessible
  console.log('1. Testing server accessibility...');
  try {
    const response = await axios.get(baseUrl, { timeout: 5000 });
    console.log('✅ Server is accessible');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running or not accessible');
      return;
    } else if (error.response) {
      console.log('✅ Server is accessible (got response)');
    } else {
      console.log('⚠️  Server accessibility unclear:', error.message);
    }
  }

  // Test 2: Test webhook GET without parameters
  console.log('\n2. Testing GET /whatsapp/webhook without parameters...');
  try {
    const response = await axios.get(`${baseUrl}/whatsapp/webhook`, { timeout: 5000 });
    console.log('Response:', response.status, response.data);
  } catch (error) {
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Message: ${error.response.data?.message || error.response.data}`);
      if (error.response.status === 403) {
        console.log('✅ Expected 403 - endpoint is working but needs parameters');
      }
    } else {
      console.log('❌ Error:', error.message);
    }
  }

  // Test 3: Test webhook GET with verification parameters (simulating Meta)
  console.log('\n3. Testing GET /whatsapp/webhook with verification parameters (Meta simulation)...');
  try {
    const response = await axios.get(`${baseUrl}/whatsapp/webhook`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': 'test_challenge_12345'
      },
      timeout: 5000
    });
    console.log('✅ Verification successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    console.log('\n🎉 The webhook should work with Meta now!');
  } catch (error) {
    if (error.response) {
      console.log('❌ Verification failed');
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
      
      if (error.response.status === 403) {
        console.log('\n⚠️  ISSUE: Token validation failed');
        console.log('Possible causes:');
        console.log('  1. Verify token in database does not match');
        console.log('  2. Database connection issue');
        console.log('  3. Code changes not deployed');
      }
    } else {
      console.log('❌ Network error:', error.message);
    }
  }

  // Test 4: Test POST webhook
  console.log('\n4. Testing POST /whatsapp/webhook...');
  try {
    const response = await axios.post(`${baseUrl}/whatsapp/webhook`, {
      object: 'whatsapp_business_account',
      entry: []
    }, { timeout: 5000 });
    console.log('✅ POST webhook working');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
  }

  // Test 5: Check if changes are deployed
  console.log('\n5. Checking if @Public() decorator is working...');
  console.log('   (If Test 2 returned 403 with helpful message, decorator is working)');

  console.log('\n=== TEST SUMMARY ===');
  console.log('Webhook URL: https://whatsapp.api.luisant.cloud/whatsapp/webhook');
  console.log('Verify Token: whatsapp_webhook_verify_token_123');
  console.log('\nNext steps:');
  console.log('1. If Test 3 passed: Try verifying in Meta Console again');
  console.log('2. If Test 3 failed: Check server logs for detailed error');
  console.log('3. Ensure backend server is restarted after code changes');
}

testWebhookEndpoint().catch(console.error);
