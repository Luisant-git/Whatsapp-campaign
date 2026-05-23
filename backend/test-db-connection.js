const { PrismaClient } = require('@prisma/client-tenant');

async function testConnection() {
  console.log('\n=== Testing Tenant Database Connection ===\n');

  // Get DB URL from environment or construct it
  const dbUrl = process.env.TENANT_DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ TENANT_DATABASE_URL not set in environment');
    process.exit(1);
  }

  console.log('Database URL:', dbUrl.replace(/:[^:@]+@/, ':****@'));

  const prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl }
    },
    log: ['query', 'error', 'warn']
  });

  try {
    // Test 1: Basic connection
    console.log('\n1. Testing basic connection...');
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Test 2: Simple query
    console.log('\n2. Testing simple query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query successful:', result);

    // Test 3: Check if MetaLead table exists
    console.log('\n3. Checking MetaLead table...');
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'MetaLead'
      );
    `;
    console.log('MetaLead table exists:', tableCheck);

    // Test 4: Try to count leads
    console.log('\n4. Counting existing leads...');
    const count = await prisma.metaLead.count();
    console.log('✅ Total leads in database:', count);

    // Test 5: Try a simple upsert
    console.log('\n5. Testing upsert operation...');
    const testLead = await prisma.metaLead.upsert({
      where: { leadId: 'test_' + Date.now() },
      update: { name: 'Test Lead Updated' },
      create: {
        leadId: 'test_' + Date.now(),
        formId: 'test-form',
        pageId: 'test-page',
        name: 'Test Lead',
        phone: '1234567890',
        createdTime: new Date(),
        status: 'Intake'
      }
    });
    console.log('✅ Upsert successful:', testLead.id);

    // Clean up test lead
    await prisma.metaLead.delete({ where: { id: testLead.id } });
    console.log('✅ Test lead cleaned up');

    console.log('\n✅ All tests passed! Database is working correctly.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    
    if (error.message.includes('Response from the Engine was empty')) {
      console.error('\n🔍 This error usually means:');
      console.error('   1. Database connection is timing out');
      console.error('   2. Prisma client is not properly generated');
      console.error('   3. Database credentials are incorrect');
      console.error('   4. Database server is not accessible');
      console.error('\n💡 Try running:');
      console.error('   cd /root/Whatsapp-campaign/backend');
      console.error('   npx prisma generate --schema=./prisma/schema-tenant.prisma');
      console.error('   npm run build');
      console.error('   pm2 restart whatsapp-backend');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
