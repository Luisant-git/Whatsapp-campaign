const { PrismaClient } = require('@prisma/client-tenant');

async function setupTimeSlots() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TENANT_DATABASE_URL
      }
    }
  });

  try {
    console.log('🕐 Setting up time slots from 11 AM to 6 PM...');

    // Clear existing time slots
    await prisma.flowTimeSlot.deleteMany({});
    console.log('✅ Cleared existing time slots');

    // Generate time slots from 11 AM to 6 PM with 30-minute intervals
    const timeSlots = [];
    const startHour = 11;
    const endHour = 18; // 6 PM in 24-hour format

    for (let hour = startHour; hour < endHour; hour++) {
      // Add :00 slot
      const hour12 = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      
      timeSlots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        title: `${hour12}:00 ${period}`,
        isEnabled: true
      });

      // Add :30 slot
      timeSlots.push({
        time: `${hour.toString().padStart(2, '0')}:30`,
        title: `${hour12}:30 ${period}`,
        isEnabled: true
      });
    }

    // Insert all time slots
    for (const slot of timeSlots) {
      await prisma.flowTimeSlot.create({
        data: slot
      });
      console.log(`✅ Created time slot: ${slot.title}`);
    }

    console.log(`\n🎉 Successfully created ${timeSlots.length} time slots!`);
    console.log('\nTime slots created:');
    timeSlots.forEach(slot => console.log(`  - ${slot.title}`));

  } catch (error) {
    console.error('❌ Error setting up time slots:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTimeSlots();
