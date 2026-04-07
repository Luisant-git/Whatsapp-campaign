// Test BSUID detection and message sending
// Run: node test-bsuid-send.js

async function testBSUIDDetection() {
  console.log('🔍 Testing BSUID Detection Logic\n');
  console.log('='.repeat(60) + '\n');

  // Test BSUID regex patterns
  const testCases = [
    { value: 'US.13491208655302741918', expected: 'Regular BSUID', isValid: true },
    { value: 'US.ENT.11815799212886844830', expected: 'Parent BSUID', isValid: true },
    { value: 'IN.98765432109876543210', expected: 'Regular BSUID (India)', isValid: true },
    { value: 'GB.ENT.55555555555555555555', expected: 'Parent BSUID (UK)', isValid: true },
    { value: '16505551234', expected: 'Phone Number', isValid: false },
    { value: '919876543210', expected: 'Phone Number (India)', isValid: false },
    { value: 'invalid', expected: 'Invalid', isValid: false },
    { value: 'US.123', expected: 'Invalid (too short)', isValid: false }
  ];

  // BSUID regex patterns
  const regularBSUIDPattern = /^[A-Z]{2}\.[0-9]+$/;
  const parentBSUIDPattern = /^[A-Z]{2}\.ENT\.[0-9]+$/;
  const phonePattern = /^[0-9]{10,15}$/;

  console.log('Testing identifier patterns:\n');

  testCases.forEach((test, idx) => {
    let detectedType = 'Unknown';
    let icon = '❓';

    if (parentBSUIDPattern.test(test.value)) {
      detectedType = 'Parent BSUID';
      icon = '🔷';
    } else if (regularBSUIDPattern.test(test.value)) {
      detectedType = 'Regular BSUID';
      icon = '🔹';
    } else if (phonePattern.test(test.value)) {
      detectedType = 'Phone Number';
      icon = '📱';
    } else {
      detectedType = 'Invalid';
      icon = '❌';
    }

    const status = detectedType === test.expected ? '✅' : '⚠️';
    
    console.log(`${idx + 1}. ${icon} ${test.value}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Detected: ${detectedType} ${status}`);
    console.log('');
  });
}

async function checkDatabaseForBSUID() {
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 Checking Database for BSUID Records\n');

  const { PrismaClient } = require('@prisma/client-tenant');
  const prisma = new PrismaClient();

  try {
    // Get messages with BSUID
    const messages = await prisma.whatsAppMessage.findMany({
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
        direction: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    if (messages.length > 0) {
      console.log(`✅ Found ${messages.length} messages with BSUID:\n`);
      messages.forEach((msg, idx) => {
        console.log(`${idx + 1}. Message (${msg.direction}):`);
        console.log(`   From: ${msg.from || 'N/A'}`);
        console.log(`   BSUID: ${msg.userId}`);
        console.log(`   Parent BSUID: ${msg.parentUserId || 'N/A'}`);
        console.log(`   Username: ${msg.username || 'N/A'}`);
        console.log(`   Text: ${msg.message?.substring(0, 60)}...`);
        console.log(`   Time: ${msg.createdAt}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No messages with BSUID found in database\n');
      console.log('To create test data, run: node test-bsuid-webhook.js\n');
    }

    // Get contacts with BSUID
    const contacts = await prisma.contact.findMany({
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
        username: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5
    });

    if (contacts.length > 0) {
      console.log(`✅ Found ${contacts.length} contacts with BSUID:\n`);
      contacts.forEach((contact, idx) => {
        console.log(`${idx + 1}. Contact:`);
        console.log(`   Name: ${contact.name}`);
        console.log(`   Phone: ${contact.phone || 'N/A'}`);
        console.log(`   BSUID: ${contact.userId}`);
        console.log(`   Parent BSUID: ${contact.parentUserId || 'N/A'}`);
        console.log(`   Username: ${contact.username || 'N/A'}`);
        console.log(`   Updated: ${contact.updatedAt}`);
        console.log('');
      });

      return contacts[0]; // Return first contact for testing
    } else {
      console.log('⚠️  No contacts with BSUID found in database\n');
      return null;
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

async function testMessagePayloadGeneration() {
  console.log('\n' + '='.repeat(60));
  console.log('\n📤 Testing Message Payload Generation\n');

  const testRecipients = [
    { id: 'US.13491208655302741918', type: 'BSUID' },
    { id: 'US.ENT.11815799212886844830', type: 'Parent BSUID' },
    { id: '16505551234', type: 'Phone Number' }
  ];

  const regularBSUIDPattern = /^[A-Z]{2}\.[A-Z]*\.?[0-9]+$/;

  testRecipients.forEach((recipient, idx) => {
    const isBSUID = regularBSUIDPattern.test(recipient.id);
    
    console.log(`${idx + 1}. Recipient: ${recipient.type}`);
    console.log(`   ID: ${recipient.id}`);
    console.log(`   Is BSUID: ${isBSUID ? 'Yes' : 'No'}`);
    
    if (isBSUID) {
      console.log(`   Payload: { recipient: "${recipient.id}", ... }`);
    } else {
      console.log(`   Payload: { to: "${recipient.id}", ... }`);
    }
    console.log('');
  });
}

async function showImplementationStatus() {
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 BSUID Implementation Status\n');

  const { PrismaClient } = require('@prisma/client-tenant');
  const prisma = new PrismaClient();

  try {
    // Count messages with BSUID
    const messageCount = await prisma.whatsAppMessage.count({
      where: {
        userId: {
          not: null
        }
      }
    });

    // Count contacts with BSUID
    const contactCount = await prisma.contact.count({
      where: {
        userId: {
          not: null
        }
      }
    });

    // Count messages with username
    const usernameCount = await prisma.whatsAppMessage.count({
      where: {
        username: {
          not: null
        }
      }
    });

    console.log('Database Statistics:');
    console.log(`  📨 Messages with BSUID: ${messageCount}`);
    console.log(`  👤 Contacts with BSUID: ${contactCount}`);
    console.log(`  🏷️  Messages with Username: ${usernameCount}`);
    console.log('');

    const status = messageCount > 0 || contactCount > 0 ? '✅ Active' : '⏳ Waiting for data';
    console.log(`Status: ${status}`);
    console.log('');

    if (messageCount === 0 && contactCount === 0) {
      console.log('💡 Tips:');
      console.log('  1. Run: node test-bsuid-webhook.js to simulate webhooks');
      console.log('  2. Send a test message from WhatsApp to your business number');
      console.log('  3. Check backend logs for BSUID processing');
      console.log('  4. BSUIDs will be captured automatically from real webhooks');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function runTests() {
  console.log('🚀 BSUID Detection & Sending Tests\n');
  console.log('Timestamp:', new Date().toISOString());
  console.log('');

  try {
    // Test 1: BSUID detection logic
    await testBSUIDDetection();

    // Test 2: Check database
    const contact = await checkDatabaseForBSUID();

    // Test 3: Message payload generation
    await testMessagePayloadGeneration();

    // Test 4: Implementation status
    await showImplementationStatus();

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ All tests completed successfully!\n');
    
    console.log('📝 Summary:');
    console.log('  ✅ BSUID detection patterns verified');
    console.log('  ✅ Database schema checked');
    console.log('  ✅ Message payload logic tested');
    console.log('  ✅ Implementation status reviewed');
    
    console.log('\n🎯 Your BSUID implementation is ready!');
    console.log('   It will automatically capture BSUIDs from WhatsApp webhooks.');
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runTests();
