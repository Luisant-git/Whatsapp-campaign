const axios = require('axios');

async function subscribeToWebhooks() {
  console.log('\n🔧 Subscribing to Meta Webhooks...\n');

  // IMPORTANT: Replace with your FULL access token
  const accessToken = 'EAAOXIOdNOukBRPa14kdZALy7f98M6'; // Add full token here
  const wabaId = '1069928256205726'; // Your WABA/Phone Number ID

  try {
    console.log('📱 Subscribing to "messages" webhook field...\n');

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${wabaId}/subscribed_apps`,
      {},
      {
        params: {
          access_token: accessToken
        }
      }
    );

    console.log('✅ Subscription Response:', JSON.stringify(response.data, null, 2));
    console.log('\n✅ Successfully subscribed to webhooks!\n');

    // Verify subscription
    console.log('🔍 Verifying subscription...\n');
    const verifyResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${wabaId}/subscribed_apps`,
      {
        params: {
          access_token: accessToken
        }
      }
    );

    console.log('Verification Response:', JSON.stringify(verifyResponse.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    
    if (error.response?.data?.error?.code === 100) {
      console.log('\n⚠️  This might be a permissions issue.');
      console.log('   You need to subscribe manually in Meta Dashboard:\n');
      console.log('   1. Go to: https://developers.facebook.com/apps');
      console.log('   2. Select your app');
      console.log('   3. Go to: WhatsApp > Configuration');
      console.log('   4. Scroll to "Webhook" section');
      console.log('   5. Click "Edit" button');
      console.log('   6. Make sure these are set:');
      console.log('      - Callback URL: https://whatsapp.api.luisant.cloud/whatsapp/webhook');
      console.log('      - Verify Token: whatsapp_webhook_verify_token_123');
      console.log('   7. Click "Verify and Save"');
      console.log('   8. Below that, find "Webhook fields"');
      console.log('   9. Click "Subscribe" next to "messages"');
      console.log('   10. You should see a checkmark next to "messages"\n');
    }
  }

  console.log('\n📝 Manual Steps (if script fails):\n');
  console.log('Go to Meta Dashboard and ensure:');
  console.log('1. Webhook URL is verified (green checkmark)');
  console.log('2. "messages" field is subscribed (has checkmark)');
  console.log('3. Try sending a test message from Meta Dashboard\n');
}

subscribeToWebhooks();
