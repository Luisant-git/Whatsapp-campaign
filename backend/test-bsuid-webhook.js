// Simulate WhatsApp webhook with BSUID data
// Run: node test-bsuid-webhook.js

const axios = require('axios');

const BACKEND_URL = 'https://whatsapp.api.luisant.cloud'; // Your backend URL

// Test webhook payloads
const testPayloads = {
  // Test 1: Message with BSUID (user has username, no phone)
  messageWithBSUID: {
    object: 'whatsapp_business_account',
    entry: [{
      id: '102290129340398',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15550783881',
            phone_number_id: '106540352242922'
          },
          contacts: [{
            profile: {
              name: 'John Doe Test',
              username: '@johndoe_test'
            },
            user_id: 'US.13491208655302741918',
            parent_user_id: 'US.ENT.11815799212886844830'
            // Note: wa_id is missing (user has username enabled)
          }],
          messages: [{
            from_user_id: 'US.13491208655302741918',
            from_parent_user_id: 'US.ENT.11815799212886844830',
            id: 'wamid.TEST' + Date.now(),
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: {
              body: 'Hello! Testing BSUID feature - ' + new Date().toLocaleTimeString()
            }
          }]
        },
        field: 'messages'
      }]
    }]
  },

  // Test 2: Message with both BSUID and phone number
  messageWithBoth: {
    object: 'whatsapp_business_account',
    entry: [{
      id: '102290129340398',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15550783881',
            phone_number_id: '106540352242922'
          },
          contacts: [{
            profile: {
              name: 'Jane Smith Test',
              username: '@janesmith_test'
            },
            wa_id: '16505551234',
            user_id: 'US.98765432109876543210',
            parent_user_id: 'US.ENT.12345678901234567890'
          }],
          messages: [{
            from: '16505551234',
            from_user_id: 'US.98765432109876543210',
            from_parent_user_id: 'US.ENT.12345678901234567890',
            id: 'wamid.TEST' + Date.now(),
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: {
              body: 'Testing with both phone and BSUID - ' + new Date().toLocaleTimeString()
            }
          }]
        },
        field: 'messages'
      }]
    }]
  }
};

async function testWebhook(testName, payload) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log('📤 Sending webhook to:', BACKEND_URL);
  
  try {
    const response = await axios.post(
      `${BACKEND_URL}/whatsapp/webhook`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Webhook accepted:', response.data);
    
    // Wait for processing
    console.log('⏳ Waiting for backend to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to backend. Is it running?');
    } else if (error.response) {
      console.error('❌ Webhook failed:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
    return false;
  }
}

async function verifyDatabase() {
  console.log('\n🔍 Verifying database records...');
  
  const { PrismaClient } = require('@prisma/client-tenant');
  const prisma = new PrismaClient();

  try {
    // Check for messages with BSUID
    const messagesWithBSUID = await prisma.whatsAppMessage.findMany({
      where: {
        userId: {
          not: null
        }
      },
      select: {
        id: true,
        from: true,
        userId: true,
        parentUserId: true,
        username: true,
        message: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    if (messagesWithBSUID.length > 0) {
      console.log(`✅ Found ${messagesWithBSUID.length} messages with BSUID:`);
      messagesWithBSUID.forEach((msg, idx) => {
        console.log(`\n   ${idx + 1}. Message ID: ${msg.id}`);
        console.log(`      From: ${msg.from || 'N/A'}`);
        console.log(`      User ID (BSUID): ${msg.userId}`);
        console.log(`      Parent User ID: ${msg.parentUserId || 'N/A'}`);
        console.log(`      Username: ${msg.username || 'N/A'}`);
        console.log(`      Message: ${msg.message?.substring(0, 50)}...`);
        console.log(`      Created: ${msg.createdAt}`);
      });
    } else {
      console.log('⚠️  No messages with BSUID found yet');
      console.log('   This could mean:');
      console.log('   - Webhook was not processed');
      console.log('   - Backend is not running');
      console.log('   - Database connection issue');
    }

    // Check contacts with BSUID
    const contactsWithBSUID = await prisma.contact.findMany({
      where: {
        userId: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        userId: true,
        parentUserId: true,
        username: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5
    });

    if (contactsWithBSUID.length > 0) {
      console.log(`\n✅ Found ${contactsWithBSUID.length} contacts with BSUID:`);
      contactsWithBSUID.forEach((contact, idx) => {
        console.log(`\n   ${idx + 1}. Contact: ${contact.name}`);
        console.log(`      Phone: ${contact.phone || 'N/A'}`);
        console.log(`      User ID (BSUID): ${contact.userId}`);
        console.log(`      Parent User ID: ${contact.parentUserId || 'N/A'}`);
        console.log(`      Username: ${contact.username || 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  No contacts with BSUID found yet');
    }

  } catch (error) {
    console.error('❌ Database verification error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function runTests() {
  console.log('🚀 Starting BSUID Webhook Tests\n');
  console.log('Backend URL:', BACKEND_URL);
  console.log('Timestamp:', new Date().toISOString());
  console.log('\n' + '='.repeat(60) + '\n');

  // Test 1: Message with BSUID only
  const test1 = await testWebhook('Message with BSUID (no phone)', testPayloads.messageWithBSUID);

  // Test 2: Message with both
  const test2 = await testWebhook('Message with both BSUID and phone', testPayloads.messageWithBoth);

  // Verify database
  await verifyDatabase();

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Test execution completed!');
  console.log('\n📝 Summary:');
  console.log(`   Test 1 (BSUID only): ${test1 ? '✅ Passed' : '❌ Failed'}`);
  console.log(`   Test 2 (BSUID + Phone): ${test2 ? '✅ Passed' : '❌ Failed'}`);
  
  console.log('\n📋 Next steps:');
  console.log('1. Check backend logs for BSUID processing details');
  console.log('2. Run: node test-bsuid-setup.js to verify schema');
  console.log('3. Check database directly for BSUID data');
  console.log('4. Test with real WhatsApp webhooks');
}

runTests().catch(error => {
  console.error('\n❌ Test execution failed:', error.message);
  process.exit(1);
});
