/**
 * Script to fetch raw lead data from Meta API to see the actual structure
 */

const axios = require('axios');
const { PrismaClient: TenantPrismaClient } = require('@prisma/client-tenant');

async function fetchMetaLeadSample() {
  const tenantDbUrl = process.env.TENANT_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!tenantDbUrl) {
    console.error('❌ Error: TENANT_DATABASE_URL or DATABASE_URL not found');
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
    // Get a sample lead from database
    const sampleLead = await prisma.metaLead.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (!sampleLead) {
      console.log('❌ No leads found in database');
      return;
    }
    
    console.log('📋 Sample lead from database:');
    console.log('Lead ID:', sampleLead.leadId);
    console.log('Form ID:', sampleLead.formId);
    console.log('Name:', sampleLead.name);
    console.log('Phone:', sampleLead.phone);
    console.log('Company:', sampleLead.company);
    
    // Get Meta config
    const metaConfig = await prisma.masterConfig.findFirst({
      where: { isActive: true }
    });
    
    if (!metaConfig || !metaConfig.accessToken) {
      console.log('\n❌ No active Meta config found with access token');
      return;
    }
    
    console.log('\n🔍 Fetching raw data from Meta API...\n');
    
    // Fetch the lead directly from Meta API
    const url = `https://graph.facebook.com/v25.0/${sampleLead.leadId}`;
    const response = await axios.get(url, {
      params: {
        access_token: metaConfig.accessToken,
        fields: 'id,created_time,field_data,form_id'
      }
    });
    
    console.log('✅ Raw Meta API Response:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(response.data, null, 2));
    console.log('='.repeat(80));
    
    console.log('\n📊 Field Data Analysis:');
    if (response.data.field_data) {
      response.data.field_data.forEach((field, idx) => {
        console.log(`\n${idx + 1}. Field Name: "${field.name}"`);
        console.log(`   Values:`, field.values);
        console.log(`   First Value:`, field.values[0]);
        console.log(`   Value Type:`, typeof field.values[0]);
      });
    }
    
  } catch (error) {
    if (error.response?.data?.error) {
      console.error('❌ Meta API Error:', error.response.data.error);
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

fetchMetaLeadSample();
