require('dotenv').config();
const axios = require('axios');

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

async function checkWebhookStatus() {
  console.log('🔍 Checking Meta Webhook Configuration...\n');
  
  try {
    // Get WhatsApp Business Account ID
    const phoneResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}`,
      {
        params: { access_token: ACCESS_TOKEN },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const wabaId = phoneResponse.data.verified_name ? 
      phoneResponse.data.id : 
      await getWABAId();
    
    console.log('📱 Phone Number ID:', PHONE_NUMBER_ID);
    console.log('🏢 WABA ID:', wabaId);
    
    // Check webhook subscriptions
    const webhookResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${wabaId}/subscribed_apps`,
      {
        params: { access_token: ACCESS_TOKEN },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    console.log('\n📡 Webhook Subscriptions:');
    console.log(JSON.stringify(webhookResponse.data, null, 2));
    
    if (webhookResponse.data.data && webhookResponse.data.data.length > 0) {
      console.log('\n✅ Webhook is subscribed');
      console.log('Subscribed fields:', webhookResponse.data.data[0].subscribed_fields);
    } else {
      console.log('\n❌ NO WEBHOOK SUBSCRIPTION FOUND!');
      console.log('\n💡 You need to:');
      console.log('1. Go to Meta App Dashboard');
      console.log('2. Configure webhook URL');
      console.log('3. Subscribe to "messages" field');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function getWABAId() {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}?fields=id,verified_name,display_phone_number`,
      {
        params: { access_token: ACCESS_TOKEN }
      }
    );
    return response.data.id;
  } catch (error) {
    console.error('Error getting WABA ID:', error.message);
    return null;
  }
}

checkWebhookStatus();
