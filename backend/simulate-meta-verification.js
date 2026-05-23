const axios = require('axios');

async function simulateMetaVerification() {
  console.log('\n=== SIMULATING META WEBHOOK VERIFICATION ===\n');

  const webhookUrl = 'https://whatsapp.api.luisant.cloud/whatsapp/webhook';
  const verifyToken = 'whatsapp_webhook_verify_token_123';
  const challenge = 'CHALLENGE_REPLACED_ON_VERIFICATION';

  console.log('Webhook URL:', webhookUrl);
  console.log('Verify Token:', verifyToken);
  console.log('Challenge:', challenge);
  console.log('\nSending GET request with query parameters...\n');

  try {
    // Simulate exactly what Meta sends
    const response = await axios({
      method: 'GET',
      url: webhookUrl,
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': challenge
      },
      headers: {
        'User-Agent': 'facebookplatform/1.0 (+http://www.facebook.com)',
        'Accept': '*/*'
      },
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response Body:', response.data);
    console.log('Response Body Type:', typeof response.data);

    if (response.status === 200) {
      if (response.data === challenge) {
        console.log('\n✅ SUCCESS! Webhook verification would work with Meta');
        console.log('The challenge was returned correctly.');
      } else {
        console.log('\n⚠️  WARNING: Status is 200 but challenge mismatch');
        console.log('Expected:', challenge);
        console.log('Received:', response.data);
      }
    } else if (response.status === 403) {
      console.log('\n❌ FAILED: Webhook returned 403 Forbidden');
      console.log('This means the verify token validation failed.');
      console.log('\nPossible issues:');
      console.log('1. Verify token in database does not match');
      console.log('2. Database connection issue');
      console.log('3. validateVerifyToken function has a bug');
    } else {
      console.log('\n❌ FAILED: Unexpected status code');
    }

  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }

  // Additional test: Check with wrong token
  console.log('\n\n=== TESTING WITH WRONG TOKEN (should fail) ===\n');
  try {
    const response = await axios({
      method: 'GET',
      url: webhookUrl,
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token_123',
        'hub.challenge': challenge
      },
      timeout: 10000,
      validateStatus: () => true
    });

    console.log('Response Status:', response.status);
    console.log('Response Body:', response.data);

    if (response.status === 403) {
      console.log('✅ Correctly rejected wrong token');
    } else {
      console.log('⚠️  WARNING: Should have rejected wrong token');
    }
  } catch (error) {
    console.log('Error:', error.message);
  }

  console.log('\n\n=== DEBUGGING TIPS ===');
  console.log('1. Check server logs while Meta tries to verify');
  console.log('2. Ensure the verify token in Meta Console exactly matches: whatsapp_webhook_verify_token_123');
  console.log('3. Try removing and re-adding the webhook in Meta Console');
  console.log('4. Check if there are any firewall rules blocking Meta\'s IPs');
  console.log('5. Verify SSL certificate is valid and trusted');
}

simulateMetaVerification().catch(console.error);
