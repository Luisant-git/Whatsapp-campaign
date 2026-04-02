const { Client } = require('pg');

async function fixAppointmentIsolation() {
  let tenantClient;
  
  try {
    console.log('🔧 Fixing FlowAppointment tenant isolation...');
    tenantClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/tenant_db'
    });
    await tenantClient.connect();

    console.log('\n📋 STEP 1: Add tenant_id column to FlowAppointment table');
    console.log('Execute this SQL:');
    console.log('```sql');
    console.log('ALTER TABLE "FlowAppointment" ADD COLUMN tenant_id INTEGER;');
    console.log('```');

    console.log('\n📋 STEP 2: Update existing appointments (if any) with tenant_id');
    console.log('Since you have 0 records, this step can be skipped for now.');
    console.log('But for future reference:');
    console.log('```sql');
    console.log('-- Example: Update appointments based on phone number patterns');
    console.log('UPDATE "FlowAppointment" SET tenant_id = 1 WHERE phone LIKE \'91%\';');
    console.log('UPDATE "FlowAppointment" SET tenant_id = 2 WHERE phone LIKE \'919360999351\';');
    console.log('```');

    console.log('\n📋 STEP 3: Update your appointment creation code');
    console.log('In your flow response handler, add tenant_id when creating appointments:');
    console.log('```javascript');
    console.log('// When processing flow response');
    console.log('const tenantId = extractTenantFromFlowToken(flowToken); // Gets tenant ID from flow');
    console.log('');
    console.log('// Create appointment with tenant_id');
    console.log('const appointment = await db.query(`');
    console.log('  INSERT INTO "FlowAppointment" ');
    console.log('  (department, location, date, time, name, email, phone, "moreDetails", tenant_id)');
    console.log('  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)');
    console.log('`, [department, location, date, time, name, email, phone, moreDetails, tenantId]);');
    console.log('```');

    console.log('\n📋 STEP 4: Update appointment queries to filter by tenant');
    console.log('```javascript');
    console.log('// Wrong - shows all appointments');
    console.log('const appointments = await db.query("SELECT * FROM FlowAppointment");');
    console.log('');
    console.log('// Correct - shows only tenant appointments');
    console.log('const appointments = await db.query(');
    console.log('  "SELECT * FROM FlowAppointment WHERE tenant_id = $1", [tenantId]');
    console.log(');');
    console.log('```');

    console.log('\n🚀 Want me to execute STEP 1 automatically? (Add tenant_id column)');
    console.log('This is safe since you have 0 records currently.');

    // Execute Step 1
    console.log('\n✅ Executing STEP 1...');
    await tenantClient.query('ALTER TABLE "FlowAppointment" ADD COLUMN tenant_id INTEGER');
    console.log('✅ tenant_id column added successfully!');

    // Verify the change
    const columns = await tenantClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'FlowAppointment' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Updated FlowAppointment table structure:');
    columns.rows.forEach(col => {
      const isNew = col.column_name === 'tenant_id';
      console.log(`   ${isNew ? '🆕' : '  '} ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✅ NEXT STEPS:');
    console.log('1. Update your appointment creation code to include tenant_id');
    console.log('2. Update your appointment listing queries to filter by tenant_id');
    console.log('3. Test with a new appointment booking');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (tenantClient) await tenantClient.end();
  }
}

fixAppointmentIsolation();