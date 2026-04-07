const { Client } = require('pg');

async function testTenantDb() {
  console.log('🔍 Testing Tenant Database Connection...\n');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'root',
    database: 'tenant_user_example_com'
  });

  try {
    await client.connect();
    console.log('✅ Connected to tenant_user_example_com\n');

    // Check if WhatsAppMessage table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'WhatsAppMessage'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ WhatsAppMessage table exists\n');

      // Check BSUID columns
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'WhatsAppMessage'
        AND column_name IN ('userId', 'parentUserId', 'username', 'from', 'to')
        ORDER BY column_name;
      `);

      console.log('📋 WhatsAppMessage columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });

      // Check Contact table
      const contactCols = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'Contact'
        AND column_name IN ('userId', 'parentUserId', 'username')
        ORDER BY column_name;
      `);

      console.log('\n📋 Contact BSUID columns:');
      contactCols.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });

    } else {
      console.log('❌ WhatsAppMessage table does NOT exist!');
      console.log('   Run migrations on this database');
    }

    await client.end();
    console.log('\n✅ Database connection test completed');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testTenantDb();
