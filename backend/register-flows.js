// Run this script to register your flows in the database
// node register-flows.js

const { PrismaClient } = require('@prisma/client-tenant');

async function registerFlows() {
  const prisma = new PrismaClient();

  try {
    // Register appointment flow
    await prisma.whatsappFlow.upsert({
      where: { flowId: '1596122471595725' },
      update: {},
      create: {
        name: 'Appointment Booking',
        flowId: '1596122471595725',
        purpose: 'appointment',
        description: 'Book appointments with our team',
        firstScreen: 'APPOINTMENT',
        triggerWords: ['appointment', 'book', 'schedule'],
        isActive: true
      }
    });

    // Register feedback flow (example)
    await prisma.whatsappFlow.upsert({
      where: { flowId: '1896122471000000' },
      update: {},
      create: {
        name: 'Customer Feedback',
        flowId: '1896122471000000',
        purpose: 'feedback',
        description: 'Collect customer feedback',
        firstScreen: 'FEEDBACK',
        triggerWords: ['feedback', 'review', 'rating'],
        isActive: true
      }
    });

    // Register lead capture flow (example)
    await prisma.whatsappFlow.upsert({
      where: { flowId: '1723456798765432' },
      update: {},
      create: {
        name: 'Lead Capture',
        flowId: '1723456798765432',
        purpose: 'lead',
        description: 'Capture potential customer information',
        firstScreen: 'LEAD_CAPTURE',
        triggerWords: ['demo', 'trial', 'pricing'],
        isActive: true
      }
    });

    console.log('✅ Flows registered successfully!');
  } catch (error) {
    console.error('❌ Error registering flows:', error);
  } finally {
    await prisma.$disconnect();
  }
}

registerFlows();