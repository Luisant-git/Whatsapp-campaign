// Test script to verify BSUID implementation
// Run: node test-bsuid-setup.js

const { PrismaClient } = require('@prisma/client-tenant');

async function testBSUIDSetup() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Testing BSUID Implementation...\n');

    // Test 1: Check if BSUID columns exist in WhatsAppMessage
    console.log('1️⃣ Checking WhatsAppMessage table schema...');
    const messageResult = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'WhatsAppMessage' 
      AND column_name IN ('userId', 'parentUserId', 'username')
    `;
    
    if (messageResult.length === 3) {
      console.log('✅ BSUID columns exist in WhatsAppMessage table');
      messageResult.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log(`❌ BSUID columns missing! Found ${messageResult.length}/3 columns`);
      console.log('   Run: npx prisma db push --schema=./prisma/schema-tenant.prisma');
      return;
    }

    // Test 2: Check Contact table
    console.log('\n2️⃣ Checking Contact table schema...');
    const contactCols = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Contact' 
      AND column_name IN ('userId', 'parentUserId', 'username')
    `;
    
    if (contactCols.length === 3) {
      console.log('✅ BSUID columns exist in Contact table');
      contactCols.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log(`❌ BSUID columns missing in Contact table! Found ${contactCols.length}/3`);
    }

    // Test 3: Check indexes
    console.log('\n3️⃣ Checking indexes...');
    const indexes = await prisma.$queryRaw`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'WhatsAppMessage' 
      AND indexname LIKE '%userId%'
    `;
    
    if (indexes.length > 0) {
      console.log('✅ BSUID indexes created');
      indexes.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
    } else {
      console.log('⚠️  No BSUID indexes found (optional but recommended)');
    }

    // Test 4: Try to query messages with BSUID
    console.log('\n4️⃣ Checking for existing BSUID data...');
    const messagesWithBSUID = await prisma.whatsAppMessage.findMany({
      where: {
        userId: {
          not: null
        }
      },
      take: 3,
      select: {
        id: true,
        from: true,
        userId: true,
        parentUserId: true,
        username: true,
        createdAt: true
      }
    });

    if (messagesWithBSUID.length > 0) {
      console.log(`✅ Found ${messagesWithBSUID.length} messages with BSUID data`);
      messagesWithBSUID.forEach(msg => {
        console.log(`   - BSUID: ${msg.userId}, Username: ${msg.username || 'N/A'}`);
      });
    } else {
      console.log('ℹ️  No messages with BSUID yet (this is normal if feature just deployed)');
    }

    // Test 5: Check contacts with BSUID
    const contactsWithBSUID = await prisma.contact.findMany({
      where: {
        userId: {
          not: null
        }
      },
      take: 3,
      select: {
        id: true,
        name: true,
        phone: true,
        userId: true,
        username: true
      }
    });

    if (contactsWithBSUID.length > 0) {
      console.log(`\n✅ Found ${contactsWithBSUID.length} contacts with BSUID data`);
      contactsWithBSUID.forEach(contact => {
        console.log(`   - ${contact.name}: ${contact.userId}`);
      });
    } else {
      console.log('\nℹ️  No contacts with BSUID yet');
    }

    console.log('\n✅ BSUID setup verification complete!');
    console.log('\n📝 Next steps:');
    console.log('1. BSUID will be captured automatically from WhatsApp webhooks');
    console.log('2. When users enable usernames, their BSUID will be stored');
    console.log('3. System will work with both phone numbers and BSUIDs');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBSUIDSetup();
