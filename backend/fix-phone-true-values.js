/**
 * Script to fix phone numbers that are stored as "true" or "false" strings
 * This will set them to null so they can be re-synced properly
 */

const { PrismaClient: TenantPrismaClient } = require('@prisma/client-tenant');

async function fixPhoneValues() {
  // You need to provide your tenant database URL
  const tenantDbUrl = process.env.TENANT_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!tenantDbUrl) {
    console.error('❌ Error: TENANT_DATABASE_URL or DATABASE_URL not found in environment');
    console.log('Please set the database URL in your .env file');
    return;
  }
  
  const prisma = new TenantPrismaClient({
    datasources: {
      db: {
        url: tenantDbUrl
      }
    }
  });
  
  try {
    console.log('🔍 Finding leads with invalid phone values...');
    
    // Find all leads where phone is "true" or "false"
    const invalidLeads = await prisma.metaLead.findMany({
      where: {
        OR: [
          { phone: 'true' },
          { phone: 'false' },
        ]
      },
      select: {
        id: true,
        leadId: true,
        name: true,
        phone: true,
      }
    });
    
    console.log(`Found ${invalidLeads.length} leads with invalid phone values`);
    
    if (invalidLeads.length > 0) {
      console.log('\nSample records:');
      invalidLeads.slice(0, 5).forEach(lead => {
        console.log(`  - ID: ${lead.id}, Name: ${lead.name}, Phone: "${lead.phone}"`);
      });
    }
    
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
    
    console.log(`\n✅ Updated ${result.count} leads - set phone to null`);
    console.log('💡 Now re-sync your leads from Meta to get the correct phone numbers');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPhoneValues();
