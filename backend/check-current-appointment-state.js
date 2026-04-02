const { Client } = require('pg');

async function checkCurrentAppointmentState() {
  let tenantClient;
  
  try {
    console.log('🔍 Checking current FlowAppointment state...');
    tenantClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/tenant_db'
    });
    await tenantClient.connect();

    // Check table structure including tenant_id
    const columns = await tenantClient.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'FlowAppointment' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 FlowAppointment table structure:');
    columns.rows.forEach(col => {
      const highlight = col.column_name === 'tenant_id' ? '🎯' : '  ';
      console.log(`   ${highlight} ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check all appointments
    const appointments = await tenantClient.query('SELECT * FROM "FlowAppointment" ORDER BY id DESC');
    
    console.log(`\n📊 FlowAppointment data (${appointments.rows.length} total records):`);
    
    if (appointments.rows.length === 0) {
      console.log('   No appointments found');
    } else {
      appointments.rows.forEach((appointment, index) => {
        console.log(`\n   📅 Appointment ${index + 1}:`);
        console.log(`     ID: ${appointment.id}`);
        console.log(`     Name: ${appointment.name}`);
        console.log(`     Phone: ${appointment.phone}`);
        console.log(`     Date: ${appointment.date}`);
        console.log(`     Time: ${appointment.time}`);
        console.log(`     🎯 Tenant ID: ${appointment.tenant_id || 'NULL'}`);
        console.log(`     Created: ${appointment.createdAt}`);
      });

      // Check tenant distribution
      const tenantStats = await tenantClient.query(`
        SELECT tenant_id, COUNT(*) as count 
        FROM "FlowAppointment" 
        GROUP BY tenant_id 
        ORDER BY tenant_id
      `);
      
      console.log('\n📊 Appointments by Tenant:');
      tenantStats.rows.forEach(stat => {
        console.log(`   Tenant ${stat.tenant_id || 'NULL'}: ${stat.count} appointments`);
      });

      // Check for appointments without tenant_id
      const orphanedCount = await tenantClient.query(`
        SELECT COUNT(*) as count FROM "FlowAppointment" WHERE tenant_id IS NULL
      `);
      
      if (orphanedCount.rows[0].count > 0) {
        console.log(`\n⚠️  Found ${orphanedCount.rows[0].count} appointments without tenant_id!`);
        console.log('These appointments will be visible to all tenants.');
        
        console.log('\n🔧 Fix orphaned appointments:');
        console.log('```sql');
        console.log('-- Update appointments based on phone patterns or other criteria');
        console.log('UPDATE "FlowAppointment" SET tenant_id = 2 WHERE phone = \'919360999351\';');
        console.log('UPDATE "FlowAppointment" SET tenant_id = 1 WHERE tenant_id IS NULL; -- Default to tenant 1');
        console.log('```');
      } else {
        console.log('\n✅ All appointments have tenant_id assigned');
      }
    }

    console.log('\n💡 NEXT STEPS:');
    console.log('1. ✅ tenant_id column exists');
    console.log('2. 🔧 Update appointment creation code to set tenant_id');
    console.log('3. 🔧 Update appointment queries to filter by tenant_id');
    console.log('4. 🧪 Test new appointment booking');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (tenantClient) await tenantClient.end();
  }
}

checkCurrentAppointmentState();