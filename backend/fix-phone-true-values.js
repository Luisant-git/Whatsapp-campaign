/**
 * Script to fix phone numbers that are stored as "true" or "false" strings
 * This will set them to null so they can be re-synced properly
 */

const { PrismaClient } = require('@prisma/client');

async function fixPhoneValues() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Finding leads with invalid phone values...');
    
    // Find all leads where phone is "true" or "false"
    const invalidLeads = await prisma.metaLead.findMany({
      where: {
        OR: [
          { phone: 'true' },
          { phone: 'false' },
        ]
      }
    });
    
    console.log(`Found ${invalidLeads.length} leads with invalid phone values`);
    
    if (invalidLeads.length === 0) {
      console.log('✅ No invalid phone values found!');
      return;
    }
    
    // Update them to null
    const result = await prisma.metaLead.updateMany({
      where: {
        OR: [
          { phone: 'true' },
          { phone: 'false' },
        ]
      },
      data: {
        phone: null
      }
    });
    
    console.log(`✅ Updated ${result.count} leads - set phone to null`);
    console.log('💡 Now re-sync your leads from Meta to get the correct phone numbers');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPhoneValues();
