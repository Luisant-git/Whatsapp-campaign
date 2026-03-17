const { PrismaClient } = require('@prisma/client');
const { PrismaClient: TenantPrismaClient } = require('@prisma/client-tenant');

// This script populates flow appointment data for testing
async function setupFlowData() {
  console.log('🚀 Setting up Flow Appointment data...');

  // Central database connection
  const centralPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.CENTRAL_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/whatsapp_central'
      }
    }
  });

  try {
    // Get the first active tenant
    const tenant = await centralPrisma.tenant.findFirst({
      where: { isActive: true }
    });

    if (!tenant) {
      console.error('❌ No active tenant found. Please create a tenant first.');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.name} (ID: ${tenant.id})`);

    // Connect to tenant database
    const tenantDbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: tenantDbUrl }
      }
    });

    // 1. Create Flow Departments
    console.log('📋 Creating departments...');
    const departments = [
      { name: 'sales', title: 'Sales Department', isActive: true },
      { name: 'support', title: 'Customer Support', isActive: true },
      { name: 'technical', title: 'Technical Support', isActive: true },
      { name: 'billing', title: 'Billing & Finance', isActive: true },
      { name: 'hr', title: 'Human Resources', isActive: true }
    ];

    for (const dept of departments) {
      await tenantPrisma.$executeRaw`
        INSERT INTO "FlowDepartment" (name, title, "isActive", "createdAt", "updatedAt")
        VALUES (${dept.name}, ${dept.title}, ${dept.isActive}, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET
          title = EXCLUDED.title,
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = NOW()
      `;
    }
    console.log(`✅ Created ${departments.length} departments`);

    // 2. Create Flow Locations
    console.log('📍 Creating locations...');
    const locations = [
      { name: 'new_york', title: 'New York Office', isActive: true },
      { name: 'london', title: 'London Office', isActive: true },
      { name: 'singapore', title: 'Singapore Office', isActive: true },
      { name: 'mumbai', title: 'Mumbai Office', isActive: true },
      { name: 'remote', title: 'Remote/Online', isActive: true }
    ];

    for (const loc of locations) {
      await tenantPrisma.$executeRaw`
        INSERT INTO "FlowLocation" (name, title, "isActive", "createdAt", "updatedAt")
        VALUES (${loc.name}, ${loc.title}, ${loc.isActive}, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET
          title = EXCLUDED.title,
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = NOW()
      `;
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
      { time: '12:00', title: '12:00 PM', isEnabled: false }, // Lunch break
      { time: '12:30', title: '12:30 PM', isEnabled: false }, // Lunch break
      { time: '13:00', title: '1:00 PM', isEnabled: false },  // Lunch break
      { time: '13:30', title: '1:30 PM', isEnabled: false },  // Lunch break
      { time: '14:00', title: '2:00 PM', isEnabled: true },
      { time: '14:30', title: '2:30 PM', isEnabled: true },
      { time: '15:00', title: '3:00 PM', isEnabled: true },
      { time: '15:30', title: '3:30 PM', isEnabled: true },
      { time: '16:00', title: '4:00 PM', isEnabled: true },
      { time: '16:30', title: '4:30 PM', isEnabled: true },
      { time: '17:00', title: '5:00 PM', isEnabled: true }
    ];

    for (const slot of timeSlots) {
      await tenantPrisma.$executeRaw`
        INSERT INTO "FlowTimeSlot" (time, title, "isEnabled", "createdAt", "updatedAt")
        VALUES (${slot.time}, ${slot.title}, ${slot.isEnabled}, NOW(), NOW())
        ON CONFLICT (time) DO UPDATE SET
          title = EXCLUDED.title,
          "isEnabled" = EXCLUDED."isEnabled",
          "updatedAt" = NOW()
      `;
    }
    console.log(`✅ Created ${timeSlots.length} time slots`);

    console.log('🎉 Flow appointment data setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${departments.length} departments created`);
    console.log(`   • ${locations.length} locations created`);
    console.log(`   • ${timeSlots.length} time slots created`);
    console.log('\n🔗 Your flow endpoint should now return dynamic data from the database.');

  } catch (error) {
    console.error('❌ Error setting up flow data:', error);
  } finally {
    await centralPrisma.$disconnect();
  }
}

// Run the setup
setupFlowData().catch(console.error);