const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Your backend URL
const PHONE_NUMBER_ID = 'your_phone_number_id'; // Replace with your phone number ID
const RECIPIENT = 'recipient_phone_number'; // Replace with recipient's phone number

class FlowMessageTester {
  
  /**
   * Send an interactive Flow message
   */
  static async sendInteractiveFlow() {
    try {
      console.log('🚀 Sending interactive Flow message...');
      
      const response = await axios.post(`${BASE_URL}/flow-message/send/${PHONE_NUMBER_ID}`, {
        to: RECIPIENT,
        flowName: 'appointment_booking_v1', // Your flow name in Meta Business Manager
        flowCta: 'Book Appointment',
        header: '📅 Book Your Appointment',
        body: 'Click the button below to book your appointment with us.',
        footer: 'Powered by WhatsApp Flows',
        flowAction: 'data_exchange', // This will call your endpoint
        flowToken: crypto.randomBytes(16).toString('hex')
      });

      console.log('✅ Interactive Flow message sent successfully!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.error('❌ Failed to send interactive Flow message:');
      console.error(error.response?.data || error.message);
    }
  }

  /**
   * Send Flow with initial data
   */
  static async sendFlowWithData() {
    try {
      console.log('🚀 Sending Flow message with initial data...');
      
      const response = await axios.post(`${BASE_URL}/flow-message/send/${PHONE_NUMBER_ID}`, {
        to: RECIPIENT,
        flowName: 'appointment_booking_v1',
        flowCta: 'Book Now',
        header: '🏥 Medical Appointment',
        body: 'Book your medical appointment quickly and easily.',
        flowAction: 'navigate',
        flowActionPayload: {
          screen: 'APPOINTMENT',
          data: {
            department: 'cardiology',
            location: 'main_hospital'
          }
        },
        flowToken: crypto.randomBytes(16).toString('hex')
      });

      console.log('✅ Flow message with data sent successfully!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.error('❌ Failed to send Flow message with data:');
      console.error(error.response?.data || error.message);
    }
  }

  /**
   * Send appointment booking flow (shortcut method)
   */
  static async sendAppointmentFlow() {
    try {
      console.log('🚀 Sending appointment booking Flow...');
      
      const response = await axios.post(`${BASE_URL}/flow-message/send-appointment/${PHONE_NUMBER_ID}`, {
        to: RECIPIENT
      });

      console.log('✅ Appointment Flow sent successfully!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.error('❌ Failed to send appointment Flow:');
      console.error(error.response?.data || error.message);
    }
  }

  /**
   * Create a Flow template
   */
  static async createFlowTemplate() {
    try {
      console.log('🚀 Creating Flow template...');
      
      const response = await axios.post(`${BASE_URL}/flow-message/create-template`, {
        wabaId: 'your_waba_id', // Replace with your WABA ID
        templateName: 'appointment_booking_template',
        category: 'UTILITY',
        language: 'en_US',
        bodyText: 'Book your appointment with us using our easy booking system.',
        buttonText: 'Book Appointment',
        flowName: 'appointment_booking_v1', // Your flow name
        accessToken: 'your_access_token' // Replace with your access token
      });

      console.log('✅ Flow template created successfully!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.error('❌ Failed to create Flow template:');
      console.error(error.response?.data || error.message);
    }
  }

  /**
   * Send Flow template message
   */
  static async sendFlowTemplate() {
    try {
      console.log('🚀 Sending Flow template message...');
      
      const response = await axios.post(`${BASE_URL}/flow-message/send-template/${PHONE_NUMBER_ID}`, {
        templateName: 'appointment_booking_template',
        to: RECIPIENT,
        languageCode: 'en_US',
        flowToken: crypto.randomBytes(16).toString('hex'),
        flowActionData: {
          department: 'general',
          preferred_time: 'morning'
        }
      });

      console.log('✅ Flow template sent successfully!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.error('❌ Failed to send Flow template:');
      console.error(error.response?.data || error.message);
    }
  }

  /**
   * Test endpoint connectivity
   */
  static async testConnection() {
    try {
      console.log('🔍 Testing connection to Flow message service...');
      
      const response = await axios.get(`${BASE_URL}/flow-message/test`);
      
      console.log('✅ Connection successful!');
      console.log('Service info:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.error('❌ Connection failed:');
      console.error(error.response?.data || error.message);
    }
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'test-connection':
    FlowMessageTester.testConnection();
    break;
  case 'send-interactive':
    FlowMessageTester.sendInteractiveFlow();
    break;
  case 'send-with-data':
    FlowMessageTester.sendFlowWithData();
    break;
  case 'send-appointment':
    FlowMessageTester.sendAppointmentFlow();
    break;
  case 'create-template':
    FlowMessageTester.createFlowTemplate();
    break;
  case 'send-template':
    FlowMessageTester.sendFlowTemplate();
    break;
  default:
    console.log('Flow Message Tester');
    console.log('');
    console.log('Available commands:');
    console.log('  test-connection   - Test connection to the service');
    console.log('  send-interactive  - Send interactive Flow message');
    console.log('  send-with-data    - Send Flow with initial data');
    console.log('  send-appointment  - Send appointment booking Flow');
    console.log('  create-template   - Create a Flow template');
    console.log('  send-template     - Send Flow template message');
    console.log('');
    console.log('Examples:');
    console.log('  node test-flow-messages.js test-connection');
    console.log('  node test-flow-messages.js send-interactive');
    console.log('  node test-flow-messages.js send-appointment');
    console.log('');
    console.log('⚠️  Remember to update the configuration at the top of this file!');
}

module.exports = FlowMessageTester;