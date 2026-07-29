import 'dotenv/config';
import { PrismaClient as CentralPrismaClient } from '@prisma/client-central';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import axios from 'axios';

const centralPrisma = new CentralPrismaClient({
  datasources: { db: { url: process.env.CENTRAL_DATABASE_URL } },
});

async function main() {
  const tenants = await centralPrisma.tenant.findMany({ where: { id: 6 } }); // Tenant 6
  if (tenants.length === 0) return;
  const tenant = tenants[0];
  
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

    const testPhones = [
      '917337636245',
      '919686774733',
      '918147125970'
    ];

    console.log("Re-testing failed numbers to get the exact error from Meta...\n");

    for (const phone of testPhones) {
      try {
        console.log(`Sending test template to ${phone}...`);
        await axios.post(
          `${apiUrl}/${phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
              name: 'job_offer_snp_v1',
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
        console.log(`✅ Success for ${phone}! (Wait, it worked this time?)`);
      } catch (error: any) {
        console.log(`❌ FAILED for ${phone}`);
        if (error.response && error.response.data) {
           console.log(`Exact Meta Error Reason:`, JSON.stringify(error.response.data.error, null, 2));
           
           if (error.response.data.error.code === 131026) {
              console.log("👉 Translation: This phone number does not have a WhatsApp account, or the user blocked your business.");
           } else if (error.response.data.error.code === 131031) {
              console.log("👉 Translation: User account is restricted or not a valid WhatsApp number.");
           }
        } else {
           console.log(`Error:`, error.message);
        }
      }
      console.log('-----------------------------------');
    }

  } finally {
    await tenantPrisma.$disconnect();
    await centralPrisma.$disconnect();
  }
}

main();
