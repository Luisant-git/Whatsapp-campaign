const axios = require('axios');

async function checkMetaWebhookSubscription() {
  console.log('\n🔍 Checking Meta Webhook Subscription...\n');

  const accessToken = 'EAAOXIOdNOukBRPa14kdZALy7f98M6etKfBYuJw55OPSYmwa6nfmBtjiO1071ZAHJZCPOSGHhrGEWB15aXeWV6ziELvcqUrsnsrwZAbloAaIVK4vY3AVwZAYjKTz6CFFsXCtbS9MQwUNZBS5HUgMe8kC0bYUYBeYuH2ahbOj7v0tNWKfIbMSEV3rUtpVX0bbwZDZD'; // Your access token (add full token)
  const phoneNumberId = '1069928256205726';

  try {
    // Get WABA ID from phone number
    console.log('📱 Getting WABA ID...');
    const phoneResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        params: { access_token: accessToken }
      }
    );

    console.log('Phone Number Info:', phoneResponse.data);
    const wabaId = phoneResponse.data.waba_id || phoneResponse.data.id;
    console.log(`✅ WABA ID: ${wabaId}\n`);

    // Check webhook subscriptions
    console.log('🔗 Checking webhook subscriptions...');
    const webhookResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${wabaId}/subscribed_apps`,
      {
        params: { access_token: accessToken }
      }
    );

    console.log('Webhook Subscriptions:', JSON.stringify(webhookResponse.data, null, 2));

    if (webhookResponse.data.data && webhookResponse.data.data.length > 0) {
      console.log('\n✅ Webhook is subscribed!');
      webhookResponse.data.data.forEach(app => {
        console.log(`\n   App ID: ${app.id}`);
        console.log(`   Subscribed fields: ${app.subscribed_fields?.join(', ') || 'None'}`);
      });
    } else {
      console.log('\n❌ No webhook subscriptions found!');
      console.log('\n🔧 You need to subscribe to webhooks in Meta Dashboard:');
      console.log('   1. Go to: https://developers.facebook.com/apps');
      console.log('   2. Select your app');
      console.log('   3. Go to WhatsApp > Configuration');
      console.log('   4. Click "Edit" on Webhook');
      console.log('   5. Enter:');
      console.log('      - Callback URL: https://whatsapp.api.luisant.cloud/whatsapp/webhook');
      console.log('      - Verify Token: whatsapp_webhook_verify_token_123');
      console.log('   6. Click "Verify and Save"');
      console.log('   7. Subscribe to "messages" field');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n⚠️  Access token might be invalid or expired');
      console.log('   Get a new token from Meta Dashboard');
    }
  }

  console.log('\n');
}

checkMetaWebhookSubscription();
