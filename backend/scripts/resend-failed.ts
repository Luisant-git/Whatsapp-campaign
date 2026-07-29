import 'dotenv/config';
import { PrismaClient as CentralPrismaClient } from '@prisma/client-central';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import axios from 'axios';

const centralPrisma = new CentralPrismaClient({
  datasources: { db: { url: process.env.CENTRAL_DATABASE_URL } },
});

async function main() {
  const tenants = await centralPrisma.tenant.findMany({ where: { id: 6 } });
  if (tenants.length === 0) return;
  const tenant = tenants[0];
  
  console.log(`\n======================================================`);
  console.log(`Resending failed messages for Tenant ${tenant.id} (${tenant.companyName || tenant.email})`);
  
  const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
  const tenantPrisma = new TenantPrismaClient({ datasources: { db: { url: dbUrl } } });

  try {
    await tenantPrisma.$connect();
    
    // Get credentials for this tenant
    const masterConfig = await tenantPrisma.masterConfig.findFirst({ where: { isActive: true } });
    const settings = await tenantPrisma.whatsAppSettings.findFirst();
    
    const accessToken = masterConfig?.accessToken || settings?.accessToken;
    const phoneNumberId = masterConfig?.phoneNumberId || settings?.phoneNumberId;
    const apiUrl = settings?.apiUrl || 'https://graph.facebook.com/v18.0';

    if (!accessToken || !phoneNumberId) {
       console.error("Could not find WhatsApp credentials.");
       return;
    }

    const campaigns = await tenantPrisma.campaign.findMany({
      where: { name: 'job_offer_snp' }
    });
    
    if (campaigns.length === 0) return;
    const campaign = campaigns[0];
    
    console.log(`Found campaign! Looking for failed messages...`);
    
    // ONLY fetch messages that STILL say "Error logs cleared by re-run"
    const failedMessages = await tenantPrisma.campaignMessage.findMany({
       where: { 
         campaignId: campaign.id, 
         status: 'failed',
         error: 'Error logs cleared by re-run'
       }
    });
    
    if (failedMessages.length === 0) {
       console.log(`All remaining failed messages have been properly processed and received their real error reasons from Meta!`);
       return;
    }
    
    console.log(`Found ${failedMessages.length} messages that were interrupted. Resending to finish the job...`);
    
    let newlySuccessful = 0;
    
    for (const msg of failedMessages) {
      let phone = msg.phone.replace(/[^0-9]/g, '');
      if (phone.length === 10 && /^[6-9]/.test(phone)) {
        phone = `91${phone}`;
      }
      
      console.log(`Sending to ${msg.name} (${phone})...`);
      
      try {
        const response = await axios.post(
          `${apiUrl}/${phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
              name: campaign.templateName,
              language: { code: 'en' }
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        await tenantPrisma.campaignMessage.update({
          where: { id: msg.id },
          data: {
             status: 'sent',
             error: null,
             messageId: response.data.messages[0].id
          }
        });
        
        console.log(`✅ Success!`);
        newlySuccessful++;
      } catch (error: any) {
        console.log(`❌ Still failing... Meta says:`, error.response?.data?.error?.message || error.message);
        
        await tenantPrisma.campaignMessage.update({
          where: { id: msg.id },
          data: {
             error: error.response?.data?.error?.message || error.message
          }
        });
      }
    }
    
    if (newlySuccessful > 0) {
      console.log(`\nSuccessfully resent to ${newlySuccessful} contacts!`);
    }

  } finally {
    await tenantPrisma.$disconnect();
    await centralPrisma.$disconnect();
  }
}

main();
