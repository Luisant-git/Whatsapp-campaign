const { Client } = require('pg');

async function findAppointmentData() {
  let centralClient, tenantClient;
  
  try {
    // Check central database
    console.log('🔍 Checking central database for appointment data...');
    centralClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/whatsapp_central'
    });
    await centralClient.connect();

    const centralTables = await centralClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Central DB tables:');
    centralTables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // Check tenant database for all tables
    console.log('\n🔍 Checking tenant database for all tables...');
    tenantClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/tenant_db'
    });
    await tenantClient.connect();

    const tenantTables = await tenantClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tenant DB tables:');
    tenantTables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // Check for any data that might contain appointment info
    console.log('\n🔍 Checking for appointment-related data...');
    
    // Check Campaign table (might store appointment data)
    try {
      const campaignData = await tenantClient.query('SELECT * FROM "Campaign" LIMIT 3');
      if (campaignData.rows.length > 0) {
        console.log('\n📊 Campaign table data:');
        campaignData.rows.forEach((row, index) => {
          console.log(`   Record ${index + 1}:`);
          Object.keys(row).forEach(key => {
            console.log(`     ${key}: ${row[key]}`);
          });
          console.log('');
        });
      }
    } catch (error) {
      console.log('❌ No Campaign table or error:', error.message);
    }

    // Check Contact table (might store appointment contacts)
    try {
      const contactData = await tenantClient.query('SELECT * FROM "Contact" LIMIT 3');
      if (contactData.rows.length > 0) {
        console.log('\n📊 Contact table data:');
        contactData.rows.forEach((row, index) => {
          console.log(`   Record ${index + 1}:`);
          Object.keys(row).forEach(key => {
            console.log(`     ${key}: ${row[key]}`);
          });
          console.log('');
        });
      }
    } catch (error) {
      console.log('❌ No Contact table or error:', error.message);
    }

    // Check WhatsAppMessage table (might store appointment confirmations)
    try {
      const messageData = await tenantClient.query('SELECT * FROM "WhatsAppMessage" ORDER BY id DESC LIMIT 3');
      if (messageData.rows.length > 0) {
        console.log('\n📊 WhatsAppMessage table (recent messages):');
        messageData.rows.forEach((row, index) => {
          console.log(`   Message ${index + 1}:`);
          Object.keys(row).forEach(key => {
            console.log(`     ${key}: ${row[key]}`);
          });
          console.log('');
        });
      }
    } catch (error) {
      console.log('❌ No WhatsAppMessage table or error:', error.message);
    }

    console.log('\n💡 QUESTION: Where is your appointment data stored?');
    console.log('- Is it in a separate database?');
    console.log('- Is it stored in external system (like Google Calendar, CRM)?');
    console.log('- Is it stored in files or logs?');
    console.log('- Check your flow response processing code to see where appointment_id "1775121409598" is saved');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (centralClient) await centralClient.end();
    if (tenantClient) await tenantClient.end();
  }
}

findAppointmentData();