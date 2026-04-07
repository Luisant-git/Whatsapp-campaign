const { Client } = require('pg');

async function checkDatabase() {
  console.log('🔍 Checking Database Connectivity...\n');

  // Check if PostgreSQL is running
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'root',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQL is running\n');

    // List all databases
    const result = await client.query(`
      SELECT datname FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname;
    `);

    console.log('📋 Available Databases:');
    result.rows.forEach(row => {
      console.log(`  - ${row.datname}`);
    });

    // Check if tenant_db exists
    const tenantDbExists = result.rows.some(row => row.datname === 'tenant_db');
    
    if (tenantDbExists) {
      console.log('\n✅ tenant_db exists');
      
      // Check tenant_1 database
      const tenant1Exists = result.rows.some(row => row.datname === 'tenant_1');
      if (tenant1Exists) {
        console.log('✅ tenant_1 database exists');
      } else {
        console.log('⚠️  tenant_1 database does NOT exist');
      }
    } else {
      console.log('\n❌ tenant_db does NOT exist!');
      console.log('   Run: npx prisma db push --schema=./prisma/schema-tenant.prisma');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\nPossible issues:');
    console.log('1. PostgreSQL is not running');
    console.log('2. Wrong credentials in .env file');
    console.log('3. PostgreSQL not accepting connections');
  }
}

checkDatabase();
