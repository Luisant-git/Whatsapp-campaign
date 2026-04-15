/**
 * Script to fetch all leads and check their Meta API data
 */

const axios = require('axios');
const { PrismaClient: TenantPrismaClient } = require('@prisma/client-tenant');

async function checkAllLeads() {
  const ACCESS_TOKEN = 'EAAcMSpblosgBRA6vGX8uvsi5gwE98ZBWjErfZADmtW13hBe1kSnNjT3kT0kzMSicZAjZCnrYID1OW0NCoMIex2M8OETXidZBKn2EbaLTeTsomOgqyuaWFrBg5tX5EDymCRYovXoOkZC8DryLPgBFRdNUm69TaGeuVRI6BSWUE9phpxjm6ZBaa6svuViROP0EebY0NhaGgZCQTYaZCJnUeG6qq7wHOENey9n54Qg96ZBgaHEMoZD';
  
  const tenantDbUrl = process.env.TENANT_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!tenantDbUrl) {
    console.error('❌ Error: Database URL not found');
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
    // Get all leads
    const allLeads = await prisma.metaLead.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📋 Found ${allLeads.length} leads in database\n`);
    
    for (const lead of allLeads) {
      console.log('='.repeat(80));
      console.log(`\n🔍 Checking Lead: ${lead.name || 'Unknown'}`);
      console.log(`   Database ID: ${lead.id}`);
      console.log(`   Meta Lead ID: ${lead.leadId}`);
      console.log(`   Phone in DB: ${lead.phone}`);
      
      try {
        const url = `https://graph.facebook.com/v25.0/${lead.leadId}`;
        const response = await axios.get(url, {
          params: {
            access_token: ACCESS_TOKEN,
            fields: 'id,created_time,field_data,form_id'
          }
        });
        
        console.log(`\n   📊 Field Data from Meta API:`);
        
        if (response.data.field_data) {
          response.data.field_data.forEach((field) => {
            const lowerName = field.name.toLowerCase();
            const isPhoneField = lowerName.includes('phone') || lowerName.includes('mobile') || lowerName.includes('number');
            
            if (isPhoneField) {
              console.log(`\n   📞 PHONE FIELD FOUND:`);
              console.log(`      Field Name: "${field.name}"`);
              console.log(`      Values: ${JSON.stringify(field.values)}`);
              console.log(`      First Value: "${field.values[0]}"`);
              console.log(`      Type: ${typeof field.values[0]}`);
            }
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Error fetching from Meta: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllLeads();
