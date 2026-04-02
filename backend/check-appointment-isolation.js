const { Client } = require('pg');

async function checkAppointmentIsolation() {
  let tenantClient;
  
  try {
    console.log('🔍 Checking appointment data isolation...');
    tenantClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/tenant_db'
    });
    await tenantClient.connect();
    console.log('✅ Connected to tenant database');

    // Check if there's an appointments table
    const tables = await tenantClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%appointment%' OR table_name LIKE '%booking%')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Appointment/Booking related tables:');
    tables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // Check for appointment data
    for (const table of tables.rows) {
      try {
        const data = await tenantClient.query(`SELECT * FROM "${table.table_name}" LIMIT 5`);
        console.log(`\n📊 ${table.table_name} (${data.rows.length} records shown):`);
        
        if (data.rows.length > 0) {
          // Show column names
          const columns = Object.keys(data.rows[0]);
          console.log(`   Columns: ${columns.join(', ')}`);
          
          // Check if there's a tenant ID column
          const hasTenantId = columns.some(col => 
            col.toLowerCase().includes('tenant') || 
            col.toLowerCase().includes('company') ||
            col.toLowerCase().includes('client')
          );
          
          console.log(`   Has Tenant Isolation: ${hasTenantId ? '✅ YES' : '❌ NO'}`);
          
          // Show sample data
          data.rows.forEach((row, index) => {
            console.log(`   Record ${index + 1}:`);
            Object.keys(row).forEach(key => {
              if (key.toLowerCase().includes('tenant') || 
                  key.toLowerCase().includes('id') ||
                  key.toLowerCase().includes('phone') ||
                  key.toLowerCase().includes('name')) {
                console.log(`     ${key}: ${row[key]}`);
              }
            });
          });
        }
      } catch (error) {
        console.log(`   ❌ Error reading ${table.table_name}: ${error.message}`);
      }
    }

    console.log('\n💡 SOLUTIONS:');
    console.log('1. Add tenantId column to appointment tables');
    console.log('2. Filter all queries by tenant ID');
    console.log('3. Use separate databases per tenant');
    console.log('4. Add tenant-based access control');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (tenantClient) await tenantClient.end();
  }
}

checkAppointmentIsolation();