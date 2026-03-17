// Example: How to send a WhatsApp Flow message correctly

const axios = require('axios');

async function sendFlowMessage() {
  const PHONE_NUMBER_ID = 'YOUR_PHONE_NUMBER_ID'; // e.g., '123456789'
  const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';
  const RECIPIENT_PHONE = '919994683263'; // User's phone number
  const FLOW_ID = 'YOUR_FLOW_ID'; // e.g., '1234567890123456'

  // Generate a unique flow token for this session
  const flowToken = `appointment_${Date.now()}_1_${Math.random().toString(36).substr(2, 9)}`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: RECIPIENT_PHONE,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: {
        type: 'text',
        text: 'Book an Appointment'
      },
      body: {
        text: 'Please fill out the form to book your appointment.'
      },
      footer: {
        text: 'Powered by Luisant'
      },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_token: flowToken,
          flow_id: FLOW_ID,
          flow_cta: 'Book Now',
          flow_action: 'data_exchange', // ✅ This triggers endpoint call on first screen
          // Optional: You can also use 'navigate' if you want to skip endpoint call
          flow_action_payload: {
            screen: 'APPOINTMENT', // First screen name
            data: {} // Optional initial data
          }
        }
      }
    }
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Flow message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending flow message:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage
sendFlowMessage();
