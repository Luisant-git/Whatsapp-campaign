const axios = require('axios');

// Replace with your values
const ACCESS_TOKEN = 'EAAcMSpblosgBQ0Lr9x2byXAquXp5o1ceNowmZCJBDdHMtENNjHiZA8HkMALo6tP5ctnWyJWDIBZAENZAvQluvtGAdjouaEGIPYZBglCh1NZBFpWLUMTCZC79uWG468iYgh1nSYE1Fz4NO72sA6NeMjxG6CgD8JqcsGOH7kVjxfrdZACwOyRJl5AhxqlZBZAHPwuDPgBQZDZD';
const PHONE_NUMBER_ID = '803957376127788';
const RECIPIENT_PHONE = '9360999351'; // Your phone number with country code
const FLOW_ID = '886324011071459';

async function sendFlowMessage() {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        "messaging_product": "whatsapp",
        "to": RECIPIENT_PHONE,
        "type": "template",
        "template": {
          "name": "hello_world",
          "language": {
            "code": "en_US"
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Message sent successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('❌ Error sending message:');
    console.error(error.response?.data || error.message);
  }
}

sendFlowMessage();