const axios = require('axios');

async function testWebhookAccess() {
  const baseUrl = 'http://localhost:3010';
  
  console.log('Testing webhook endpoints...\n');
  
  // Test 1: GET without parameters (should return 403 with helpful message)
  try {
    console.log('1. Testing GET /whatsapp/webhook without parameters...');
    const response = await axios.get(`${baseUrl}/whatsapp/webhook`);
    console.log('✓ Response:', response.status, response.data);
  } catch (error) {
    console.log('✗ Error:', error.response?.status, error.response?.data?.message || error.message);
  }
  
  // Test 2: GET with verification parameters (should succeed if token is valid)
  try {
    console.log('\n2. Testing GET /whatsapp/webhook with verification parameters...');
    const response = await axios.get(`${baseUrl}/whatsapp/webhook`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test_token_123',
        'hub.challenge': 'challenge_string_123'
      }
    });
    console.log('✓ Response:', response.status, response.data);
  } catch (error) {
    console.log('✗ Error:', error.response?.status, error.response?.data?.message || error.message);
  }
  
  // Test 3: POST webhook (should return EVENT_RECEIVED)
  try {
    console.log('\n3. Testing POST /whatsapp/webhook...');
    const response = await axios.post(`${baseUrl}/whatsapp/webhook`, {
      object: 'whatsapp_business_account',
      entry: []
    });
    console.log('✓ Response:', response.status, response.data);
  } catch (error) {
    console.log('✗ Error:', error.response?.status, error.response?.data?.message || error.message);
  }
  
  // Test 4: Ecommerce webhook
  try {
    console.log('\n4. Testing POST /webhooks/whatsapp...');
    const response = await axios.post(`${baseUrl}/webhooks/whatsapp`, {
      body: {
        entry: []
      }
    });
    console.log('✓ Response:', response.status, response.data);
  } catch (error) {
    console.log('✗ Error:', error.response?.status, error.response?.data?.message || error.message);
  }
}

testWebhookAccess().catch(console.error);
