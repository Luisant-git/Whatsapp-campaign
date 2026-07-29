import 'dotenv/config';
import { PrismaClient as CentralPrismaClient } from '@prisma/client-central';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';

const centralPrisma = new CentralPrismaClient({
  datasources: {
    db: { url: process.env.CENTRAL_DATABASE_URL },
  },
});

async function main() {
  console.log('Fetching active tenants...');
  const tenants = await centralPrisma.tenant.findMany({
    where: { isActive: true },
  });
  console.log(`Found ${tenants.length} active tenants.`);

  for (const tenant of tenants) {
    console.log(`\n======================================================`);
    console.log(`Checking Tenant ${tenant.id} (${tenant.companyName || tenant.email})`);
    
    // Replace localhost with remote host if necessary, or just use the DB URL dynamically
    // BUT since we might be running this by changing .env locally, let's just use the TENANT_DATABASE_URL from .env
    // or construct it if it's dynamic. Usually tenants are separated by schema or DB. 
    // In this system, they are separated by DB names.
    let dbHost = tenant.dbHost;
    if (dbHost === 'localhost' && process.env.CENTRAL_DATABASE_URL?.includes('localhost') === false) {
       // Just in case they are connecting to a remote DB but tenant still says localhost
       // We'll trust the tenant row for now.
    }
    
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
    
    const tenantPrisma = new TenantPrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    try {
      await tenantPrisma.$connect();
      
      const campaigns = await tenantPrisma.campaign.findMany({
        where: { name: 'job_offer_snp' }
      });
      
      if (campaigns.length === 0) {
        console.log(`  No 'job_offer_snp' campaign found in this tenant.`);
        await tenantPrisma.$disconnect();
        continue;
      }
      
      for (const campaign of campaigns) {
        console.log(`  Found Campaign ID: ${campaign.id}, Status: ${campaign.status}, Success: ${campaign.successCount}, Failed: ${campaign.failedCount}`);
        
        // Find all outgoing WhatsAppMessages for this template
        const sentMessages = await tenantPrisma.whatsAppMessage.findMany({
          where: {
            direction: 'outgoing',
            message: { contains: `Template ${campaign.templateName}` }
          },
          orderBy: { createdAt: 'asc' }
        });
        
        console.log(`  Found ${sentMessages.length} total outgoing messages for template ${campaign.templateName} in WhatsAppMessage.`);
        
        if (sentMessages.length > 0) {
            // Re-insert these into CampaignMessage to restore the results table
            let restoredCount = 0;
            let successCount = 0;
            let failedCount = 0;
            
            for (const msg of sentMessages) {
               // Check if it already exists
               const existing = await tenantPrisma.campaignMessage.findFirst({
                 where: { campaignId: campaign.id, phone: msg.to, messageId: msg.messageId }
               });
               
               if (!existing) {
                 await tenantPrisma.campaignMessage.create({
                   data: {
                     messageId: msg.messageId,
                     phone: msg.to,
                     name: msg.profileName || 'Unknown',
                     status: msg.status === 'sent' ? 'sent' : msg.status,
                     campaignId: campaign.id,
                     createdAt: msg.createdAt,
                     updatedAt: msg.updatedAt
                   }
                 });
                 restoredCount++;
               }
               
               if (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read') {
                  successCount++;
               } else if (msg.status === 'failed') {
                  failedCount++;
               }
            }
            
            console.log(`  Restored ${restoredCount} campaign messages from the logs.`);
            
            // Update the campaign counts to reflect the true numbers
            await tenantPrisma.campaign.update({
              where: { id: campaign.id },
              data: {
                successCount: successCount,
                failedCount: failedCount,
                status: 'completed' // Mark as completed to stop it from showing as RUNNING if it's stuck
              }
            });
            console.log(`  Campaign marked as COMPLETED. True Success: ${successCount}, True Failed: ${failedCount}`);
        }
      }

    } catch (e) {
      console.error(`  Error connecting or querying tenant ${tenant.id}:`, e.message);
    } finally {
      await tenantPrisma.$disconnect();
    }
  }
  console.log(`\n======================================================`);
  console.log('Recovery finished.');
}

main()
  .catch(e => console.error(e))
  .finally(() => centralPrisma.$disconnect());
