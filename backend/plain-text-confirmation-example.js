// Example of how to modify the sendConfirmationMessage method to send plain text

// OPTION 1: Replace template with plain text message
async function sendPlainTextConfirmation(phoneNumber, accessToken, phoneNumberId, tenantClient) {
  try {
    console.log('📤 Sending plain text confirmation...');
    console.log('📞 To:', phoneNumber);
    console.log('🔑 Phone Number ID:', phoneNumberId);
    
    const axios = require('axios');
    
    // Plain text confirmation message
    const confirmationMessage = `✅ Demo scheduled successfully! We will contact you soon.
    
📅 Your appointment has been booked
📞 We'll call you shortly to confirm the details
💬 Reply to this message if you have any questions`;
    
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: confirmationMessage
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('📨 WhatsApp API Response:', JSON.stringify(response.data, null, 2));

    // Save message to database
    await tenantClient.whatsAppMessage.create({
      data: {
        messageId: response.data.messages[0].id,
        to: phoneNumber,
        from: phoneNumberId,
        message: confirmationMessage,
        direction: 'outgoing',
        status: 'sent',
        phoneNumberId,
      }
    });

    console.log('✅ Plain text confirmation sent successfully');
  } catch (error) {
    console.error('❌ Error sending plain text confirmation:', error.response?.data || error.message);
  }
}

// OPTION 2: Dynamic message with appointment details
async function sendDynamicConfirmation(phoneNumber, accessToken, phoneNumberId, tenantClient, appointmentData) {
  try {
    const confirmationMessage = `🎉 Appointment Confirmed!

📋 Details:
👤 Name: ${appointmentData.name}
🏢 Department: ${appointmentData.department}
📍 Location: ${appointmentData.location}
📅 Date: ${appointmentData.date}
⏰ Time: ${appointmentData.time}

✅ Your appointment has been successfully booked!
📞 We will contact you at ${phoneNumber} if needed.

Thank you for choosing our services! 🙏`;

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: confirmationMessage
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Dynamic confirmation sent successfully');
  } catch (error) {
    console.error('❌ Error sending dynamic confirmation:', error.response?.data || error.message);
  }
}

console.log('📋 To implement plain text confirmations:');
console.log('');
console.log('1. Replace the template code in sendConfirmationMessage method');
console.log('2. Change type from "template" to "text"');
console.log('3. Use text.body instead of template object');
console.log('');
console.log('🔧 Code changes needed in flow-appointment.service.ts:');
console.log('- Line ~200: Replace template logic with plain text logic');
console.log('- Remove template name lookup');
console.log('- Change API payload structure');
console.log('');
console.log('💡 Benefits of plain text:');
console.log('✅ No template approval needed');
console.log('✅ Can include dynamic appointment details');
console.log('✅ More flexible message content');
console.log('✅ Easier to customize per tenant');