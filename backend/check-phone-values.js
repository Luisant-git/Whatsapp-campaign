/**
 * Script to check what phone values are actually stored in the database
 */

const { PrismaClient: TenantPrismaClient } = require('@prisma/client-tenant');

async function checkPhoneValues() {
  const tenantDbUrl = process.env.TENANT_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!tenantDbUrl) {
    console.error('❌ Error: TENANT_DATABASE_URL or DATABASE_URL not found in environment');
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
    console.log('🔍 Checking all leads in database...\n');
    
    // Get all leads
    const allLeads = await prisma.metaLead.findMany({
      select: {
        id: true,
        leadId: true,
        name: true,
        phone: true,
        email: true,
        company: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`Total leads found: ${allLeads.length}\n`);
    
    if (allLeads.length === 0) {
      console.log('No leads found in database');
      return;
    }
    
    console.log('Sample leads:');
    console.log('='.repeat(80));
    
    allLeads.forEach((lead, idx) => {
      console.log(`\n${idx + 1}. Lead ID: ${lead.id}`);
      console.log(`   Meta Lead ID: ${lead.leadId}`);
      console.log(`   Name: ${lead.name || 'N/A'}`);
      console.log(`   Phone: "${lead.phone}" (type: ${typeof lead.phone})`);
      console.log(`   Email: ${lead.email || 'N/A'}`);
      console.log(`   Company: ${lead.company || 'N/A'}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Check for specific problematic values
    const phoneStats = {
      null: 0,
      true: 0,
      false: 0,
      valid: 0,
      other: []
    };
    
    const allLeadsForStats = await prisma.metaLead.findMany({
      select: { phone: true }
    });
    
    allLeadsForStats.forEach(lead => {
      if (lead.phone === null) {
        phoneStats.null++;
      } else if (lead.phone === 'true') {
        phoneStats.true++;
      } else if (lead.phone === 'false') {
        phoneStats.false++;
      } else if (/^\d{10,}$/.test(lead.phone)) {
        phoneStats.valid++;
      } else {
        phoneStats.other.push(lead.phone);
      }
    });
    
    console.log('\n📊 Phone Statistics:');
    console.log(`   NULL values: ${phoneStats.null}`);
    console.log(`   "true" values: ${phoneStats.true}`);
    console.log(`   "false" values: ${phoneStats.false}`);
    console.log(`   Valid phone numbers (10+ digits): ${phoneStats.valid}`);
    console.log(`   Other values: ${phoneStats.other.length}`);
    
    if (phoneStats.other.length > 0) {
      console.log('\n   Sample "other" values:');
      phoneStats.other.slice(0, 10).forEach(val => {
        console.log(`     - "${val}" (type: ${typeof val})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhoneValues();
