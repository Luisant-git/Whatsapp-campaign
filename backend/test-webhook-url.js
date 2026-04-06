const axios = require('axios');

async function testWebhook() {
  console.log('\n🧪 Testing Webhook URLs...\n');

  const verifyToken = 'whatsapp_webhook_verify_token_123';
  const challenge = 'test_challenge_12345';

  // Test URLs
  const urls = [
    {
      name: 'With verify token in path',
      url: `https://whatsapp.api.luisant.cloud/whatsapp/webhook/${verifyToken}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`
    },
    {
      name: 'Without verify token in path',
      url: `https://whatsapp.api.luisant.cloud/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`
    }
  ];

  for (const test of urls) {
    console.log(`📍 Testing: ${test.name}`);
    console.log(`   URL: ${test.url}\n`);

    try {
      const response = await axios.get(test.url, {
        timeout: 10000,
        validateStatus: () => true // Accept any status
      });

      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);

      if (response.status === 200 && response.data === challenge) {
        console.log(`   ✅ SUCCESS! This is the correct webhook URL!\n`);
      } else if (response.status === 200) {
        console.log(`   ⚠️  Status 200 but wrong response\n`);
      } else {
        console.log(`   ❌ Failed\n`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  console.log('\n📝 Summary:');
  console.log('   The correct webhook URL for Meta Dashboard should be:');
  console.log(`   https://whatsapp.api.luisant.cloud/whatsapp/webhook/${verifyToken}`);
  console.log('');
  console.log('   In Meta Dashboard, configure:');
  console.log(`   - Callback URL: https://whatsapp.api.luisant.cloud/whatsapp/webhook/${verifyToken}`);
  console.log(`   - Verify Token: ${verifyToken}`);
  console.log('');
}

testWebhook();
