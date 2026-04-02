const { Client } = require('pg');

async function checkFlowAppointments() {
  let tenantClient;
  
  try {
    console.log('🔍 Checking FlowAppointment table...');
    tenantClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/tenant_db'
    });
    await tenantClient.connect();

    // Check FlowAppointment table structure
    const columns = await tenantClient.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'FlowAppointment' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 FlowAppointment table structure:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check if there's tenant isolation
    const hasTenantColumn = columns.rows.some(col => 
      col.column_name.toLowerCase().includes('tenant') ||
      col.column_name.toLowerCase().includes('company') ||
      col.column_name.toLowerCase().includes('client')
    );
    
    console.log(`\n🔒 Has Tenant Isolation Column: ${hasTenantColumn ? '✅ YES' : '❌ NO'}`);

    // Get appointment data
    const appointments = await tenantClient.query('SELECT * FROM "FlowAppointment" ORDER BY id DESC LIMIT 5');
    
    console.log(`\n📊 FlowAppointment data (${appointments.rows.length} recent records):`);
    appointments.rows.forEach((appointment, index) => {
      console.log(`\n   📅 Appointment ${index + 1}:`);
      Object.keys(appointment).forEach(key => {
        console.log(`     ${key}: ${appointment[key]}`);
      });
    });

    // Check related tables
    console.log('\n🔍 Checking related flow tables...');
    
    // FlowSession
    try {
      const sessions = await tenantClient.query('SELECT * FROM "FlowSession" ORDER BY id DESC LIMIT 3');
      console.log(`\n📊 FlowSession (${sessions.rows.length} recent records):`);
      sessions.rows.forEach((session, index) => {
        console.log(`   Session ${index + 1}: ID=${session.id}, Phone=${session.phoneNumber || 'N/A'}`);
      });
    } catch (error) {
      console.log('❌ Error reading FlowSession:', error.message);
    }

    // FlowTriggerLog
    try {
      const logs = await tenantClient.query('SELECT * FROM "FlowTriggerLog" ORDER BY id DESC LIMIT 3');
      console.log(`\n📊 FlowTriggerLog (${logs.rows.length} recent records):`);
      logs.rows.forEach((log, index) => {
        console.log(`   Log ${index + 1}: ID=${log.id}, Status=${log.status || 'N/A'}`);
      });
    } catch (error) {
      console.log('❌ Error reading FlowTriggerLog:', error.message);
    }

    console.log('\n💡 ANALYSIS:');
    if (!hasTenantColumn) {
      console.log('❌ PROBLEM: FlowAppointment table has NO tenant isolation!');
      console.log('   All appointments from all tenants are mixed together');
      console.log('   This is why you see appointments from all tenants');
      console.log('\n🔧 SOLUTIONS:');
      console.log('1. Add tenant_id column to FlowAppointment table');
      console.log('2. Update all appointment queries to filter by tenant');
      console.log('3. Add tenant_id when creating new appointments');
    } else {
      console.log('✅ Table has tenant isolation column');
      console.log('❌ Check if queries are properly filtering by tenant');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (tenantClient) await tenantClient.end();
  }
}

checkFlowAppointments();