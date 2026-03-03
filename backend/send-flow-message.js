const axios = require('axios');

// Replace with your values
const ACCESS_TOKEN = 'EAAcMSpblosgBQ0Lr9x2byXAquXp5o1ceNowmZCJBDdHMtENNjHiZA8HkMALo6tP5ctnWyJWDIBZAENZAvQluvtGAdjouaEGIPYZBglCh1NZBFpWLUMTCZC79uWG468iYgh1nSYE1Fz4NO72sA6NeMjxG6CgD8JqcsGOH7kVjxfrdZACwOyRJl5AhxqlZBZAHPwuDPgBQZDZD';
const PHONE_NUMBER_ID = '803957376127788';
const RECIPIENT_PHONE = '9080356538'; // Your phone number with country code
const FLOW_ID = '945035507959464'; // Your published Flow ID

async function sendFlowMessage() {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        "messaging_product": "whatsapp",
        "to": RECIPIENT_PHONE,
        "type": "interactive",
        "interactive": {
          "type": "flow",
          "header": {
            "type": "text",
            "text": "Welcome to Flow Sample"
          },
          "body": {
            "text": "Click the button below to start the Flow experience!"
          },
          "footer": {
            "text": "Powered by Meta Flow"
          },
          "action": {
            "name": "flow",
            "parameters": {
              "flow_message_version": "3",
              "flow_token": "flow_token_" + Date.now(),
              "flow_id": FLOW_ID,
              "flow_cta": "Start Flow",
              "flow_action": "navigate",
              "flow_action_payload": {
                "screen": "APPOINTMENT",
                "data": {
                  "user_name": "User",
                  "welcome_message": "Book your appointment!"
                }
              }
            }
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

    console.log('✅ Flow message sent successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('❌ Error sending Flow message:');
    console.error(error.response?.data || error.message);
  }
}

sendFlowMessage();