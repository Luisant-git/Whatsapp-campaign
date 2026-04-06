require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CENTRAL_DATABASE_URL
    }
  }
});

async function checkWebhookStatus() {
  console.log('🔍 Checking Production Webhook Configuration...\n');
  
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        phoneNumberId: true,
        accessToken: true,
        domain: true
      }
    });
    
    console.log(`Found ${tenants.length} tenants\n`);
    
    for (const tenant of tenants) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🏢 Tenant: ${tenant.name} (ID: ${tenant.id})`);
      console.log(`📱 Phone Number ID: ${tenant.phoneNumberId}`);
      console.log(`🌐 Domain: ${tenant.domain || 'Not set'}`);
      
      if (!tenant.phoneNumberId || !tenant.accessToken) {
        console.log('⚠️  Missing credentials - skipping');
        continue;
      }
      
      try {
        const phoneResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${tenant.phoneNumberId}`,
          {
            params: { 
              access_token: tenant.accessToken,
              fields: 'id,verified_name,display_phone_number'
            }
          }
        );
        
        console.log(`📞 Display Number: ${phoneResponse.data.display_phone_number}`);
        console.log(`✓ Verified Name: ${phoneResponse.data.verified_name}`);
        
        const wabaResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${tenant.phoneNumberId}?fields=whatsapp_business_account_id`,
          {
            params: { access_token: tenant.accessToken }
          }
        );
        
        const wabaId = wabaResponse.data.whatsapp_business_account_id;
        console.log(`🏢 WABA ID: ${wabaId}`);
        
        const webhookResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${wabaId}/subscribed_apps`,
          {
            params: { access_token: tenant.accessToken }
          }
        );
        
        if (webhookResponse.data.data && webhookResponse.data.data.length > 0) {
          console.log('\n✅ Webhook Status: SUBSCRIBED');
          const app = webhookResponse.data.data[0];
          console.log(`   App ID: ${app.whatsapp_business_api_data?.id || 'N/A'}`);
          console.log(`   Subscribed Fields: ${app.subscribed_fields?.join(', ') || 'None'}`);
        } else {
          console.log('\n❌ Webhook Status: NOT SUBSCRIBED');
          console.log('\n💡 Fix:');
          console.log(`   1. Go to Meta App Dashboard`);
          console.log(`   2. Set webhook URL to: https://${tenant.domain || 'your-domain.com'}/whatsapp/webhook`);
          console.log(`   3. Subscribe to: messages, message_template_status_update`);
        }
        
      } catch (error) {
        console.log(`\n❌ Error: ${error.response?.data?.error?.message || error.message}`);
      }
    }
    
    console.log(`\n${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkWebhookStatus();
