// Simple setup script for flow data
const { Client } = require('pg');

async function setupFlowData() {
  console.log('🚀 Setting up Flow Appointment data...');

  // Use environment variables or defaults
  const centralDbUrl = process.env.CENTRAL_DATABASE_URL || 'postgresql://postgres:root@localhost:5432/whatsapp_campaign';
  const tenantDbUrl = process.env.TENANT_DATABASE_URL || 'postgresql://postgres:root@localhost:5432/tenent_db';

  const tenantClient = new Client({ connectionString: tenantDbUrl });

  try {
    await tenantClient.connect();
    console.log('✅ Connected to tenant database');

    // 1. Create Flow Departments
    console.log('📋 Creating departments...');
    const departments = [
      { name: 'sales', title: 'Sales Department' },
      { name: 'support', title: 'Customer Support' },
      { name: 'technical', title: 'Technical Support' },
      { name: 'billing', title: 'Billing & Finance' },
      { name: 'hr', title: 'Human Resources' }
    ];

    for (const dept of departments) {
      await tenantClient.query(`
        INSERT INTO "FlowDepartment" (name, title, "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, true, NOW(), NOW())
      `, [dept.name, dept.title]);
    }
    console.log(`✅ Created ${departments.length} departments`);

    // 2. Create Flow Locations
    console.log('📍 Creating locations...');
    const locations = [
      { name: 'new_york', title: 'New York Office' },
      { name: 'london', title: 'London Office' },
      { name: 'singapore', title: 'Singapore Office' },
      { name: 'mumbai', title: 'Mumbai Office' },
      { name: 'remote', title: 'Remote/Online' }
    ];

    for (const loc of locations) {
      await tenantClient.query(`
        INSERT INTO "FlowLocation" (name, title, "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, true, NOW(), NOW())
      `, [loc.name, loc.title]);
    }
    console.log(`✅ Created ${locations.length} locations`);

    // 3. Create Flow Time Slots
    console.log('⏰ Creating time slots...');
    const timeSlots = [
      { time: '09:00', title: '9:00 AM', isEnabled: true },
      { time: '09:30', title: '9:30 AM', isEnabled: true },
      { time: '10:00', title: '10:00 AM', isEnabled: true },
      { time: '10:30', title: '10:30 AM', isEnabled: true },
      { time: '11:00', title: '11:00 AM', isEnabled: true },
      { time: '11:30', title: '11:30 AM', isEnabled: true },
      { time: '12:00', title: '12:00 PM', isEnabled: false },
      { time: '12:30', title: '12:30 PM', isEnabled: false },
      { time: '13:00', title: '1:00 PM', isEnabled: false },
      { time: '13:30', title: '1:30 PM', isEnabled: false },
      { time: '14:00', title: '2:00 PM', isEnabled: true },
      { time: '14:30', title: '2:30 PM', isEnabled: true },
      { time: '15:00', title: '3:00 PM', isEnabled: true },
      { time: '15:30', title: '3:30 PM', isEnabled: true },
      { time: '16:00', title: '4:00 PM', isEnabled: true },
      { time: '16:30', title: '4:30 PM', isEnabled: true },
      { time: '17:00', title: '5:00 PM', isEnabled: true }
    ];

    for (const slot of timeSlots) {
      await tenantClient.query(`
        INSERT INTO "FlowTimeSlot" (time, title, "isEnabled", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [slot.time, slot.title, slot.isEnabled]);
    }
    console.log(`✅ Created ${timeSlots.length} time slots`);

    console.log('🎉 Flow appointment data setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${departments.length} departments created`);
    console.log(`   • ${locations.length} locations created`);
    console.log(`   • ${timeSlots.length} time slots created`);
    console.log('\n🔗 Your flow endpoint should now return dynamic data from the database.');

  } catch (error) {
    console.error('❌ Error setting up flow data:', error.message);
  } finally {
    await tenantClient.end();
  }
}

// Run the setup
setupFlowData().catch(console.error);