// Debug script to check campaign message errors
// Run with: node debug-campaign-errors.js

const { PrismaClient } = require('@prisma/client-tenant');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TENANT_DATABASE_URL
    }
  }
});

async function checkCampaignErrors() {
  try {
    console.log('Checking campaign messages with failed status...\n');
    
    const failedMessages = await prisma.campaignMessage.findMany({
      where: {
        status: 'failed'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`Found ${failedMessages.length} failed messages:\n`);
    
    failedMessages.forEach((msg, index) => {
      console.log(`${index + 1}. Phone: ${msg.phone}`);
      console.log(`   Status: ${msg.status}`);
      console.log(`   Error: ${msg.error || 'NULL/EMPTY'}`);
      console.log(`   Created: ${msg.createdAt}`);
      console.log(`   Campaign ID: ${msg.campaignId}`);
      console.log('---');
    });

    // Check if error field is actually null or empty string
    const nullErrors = failedMessages.filter(m => m.error === null);
    const emptyErrors = failedMessages.filter(m => m.error === '');
    
    console.log(`\nSummary:`);
    console.log(`- Messages with NULL error: ${nullErrors.length}`);
    console.log(`- Messages with empty string error: ${emptyErrors.length}`);
    console.log(`- Messages with actual error text: ${failedMessages.length - nullErrors.length - emptyErrors.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCampaignErrors();
