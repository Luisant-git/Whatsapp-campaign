const axios = require('axios');

// Test script to send a WhatsApp Flow message
async function sendTestFlowMessage() {
  console.log('🚀 Sending test flow message...');

  const PHONE_NUMBER_ID = '24366060823054981'; // From your .env
  const ACCESS_TOKEN = 'EAAcMSpblosgBQr1xYP0MIbeHJQ7lecNhchuHO1jZCet3B8shfGg9SHePqGNwNbx6m4bXYD0e3dhG8JHV7vkCFkughkdhWg1LarmxgKjf0ZAbk7b3sduKw9jtkRM3AnKCl9j2BBYWSJu54e1K3plhLjDTtmbIVPV9a98ePON8ELpkF6iiLY67NhKHxBIIcasAZDZD'; // From your .env
  const RECIPIENT_PHONE = '919994683263'; // Test phone number
  const FLOW_ID = 'YOUR_FLOW_ID'; // Replace with your actual flow ID

  // Generate a proper flow token with tenant info
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
        text: 'Hi! Ready to book your appointment? Click the button below to get started.'
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
          flow_action: 'data_exchange' // ✅ This will call your endpoint
        }
      }
    }
  };

  try {
    console.log('📤 Sending flow message with token:', flowToken);
    
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

    console.log('✅ Flow message sent successfully!');
    console.log('📱 Message ID:', response.data.messages[0].id);
    console.log('🔗 Flow Token:', flowToken);
    console.log('\n📋 Expected Flow:');
    console.log('   1. APPOINTMENT screen - Select options');
    console.log('   2. DETAILS screen - Enter personal info');
    console.log('   3. SUMMARY screen - Review details');
    console.log('   4. SUCCESS screen - Appointment booked');
    
    return response.data;
  } catch (error) {
    console.error('❌ Error sending flow message:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Test using your backend API
async function sendFlowViaBackend() {
  console.log('🚀 Sending flow via backend API...');
  
  try {
    const response = await axios.post('http://localhost:3010/flow-message/send', {
      phoneNumbers: ['919994683263'],
      flowId: 'YOUR_FLOW_ID', // Replace with your actual flow ID
      headerText: 'Book an Appointment',
      bodyText: 'Hi! Ready to book your appointment? Click the button below to get started.',
      footerText: 'Powered by Luisant',
      ctaText: 'Book Now',
      screenName: 'APPOINTMENT'
    });

    console.log('✅ Flow sent via backend:', response.data);
  } catch (error) {
    console.error('❌ Backend API error:', error.response?.data || error.message);
  }
}

// Run the test
console.log('Choose test method:');
console.log('1. Direct Meta API call');
console.log('2. Via backend API');

// Uncomment the method you want to test:
// sendTestFlowMessage().catch(console.error);
// sendFlowViaBackend().catch(console.error);

console.log('\n⚠️  Remember to:');
console.log('   • Replace YOUR_FLOW_ID with your actual flow ID');
console.log('   • Update phone numbers as needed');
console.log('   • Uncomment one of the test methods above');