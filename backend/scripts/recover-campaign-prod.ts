import 'dotenv/config';
import { PrismaClient as CentralPrismaClient } from '@prisma/client-central';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';

const centralPrisma = new CentralPrismaClient({
  datasources: {
    db: { url: process.env.CENTRAL_DATABASE_URL },
  },
});

async function main() {
  const tenants = await centralPrisma.tenant.findMany({
    where: { isActive: true },
  });

  for (const tenant of tenants) {
    if (tenant.id !== 6) continue; // Only process SNPNBC CONSULTANT AND MANPOWER SERVICES
    
    console.log(`\n======================================================`);
    console.log(`Fixing counts for Tenant ${tenant.id} (${tenant.companyName || tenant.email})`);
    
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
        console.log(`  No 'job_offer_snp' campaign found.`);
        await tenantPrisma.$disconnect();
        continue;
      }
      
      for (const campaign of campaigns) {
        // Fetch all outgoing messages in chronological order
        const sentMessages = await tenantPrisma.whatsAppMessage.findMany({
          where: {
            direction: 'outgoing',
            message: { contains: `Template ${campaign.templateName}` }
          },
          orderBy: { createdAt: 'asc' }
        });
        
        console.log(`  Found ${sentMessages.length} total messages for template in history.`);
        
        // The user wants exactly the ORIGINAL count of 965
        const targetOldCount = 965;
        
        if (sentMessages.length >= targetOldCount) {
           // Get only the first 965 messages from the original run
           const originalRunMessages = sentMessages.slice(0, targetOldCount);
           const originalMessageIds = originalRunMessages.map(m => m.messageId);
           
           console.log(`  Keeping exactly ${targetOldCount} original messages.`);
           
           // Delete any campaign messages that are NOT in the first 965
           const deleteResult = await tenantPrisma.campaignMessage.deleteMany({
             where: {
               campaignId: campaign.id,
               messageId: { notIn: originalMessageIds }
             }
           });
           
           console.log(`  Deleted ${deleteResult.count} accidental re-run messages from CampaignMessage.`);
           
           // Recalculate true counts for ONLY those 965 messages
           let successCount = 0;
           let failedCount = 0;
           
           for (const msg of originalRunMessages) {
             if (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read') {
               successCount++;
             } else if (msg.status === 'failed') {
               failedCount++;
             }
           }
           
           // Force update the Campaign to show exactly 965 total count, and correct success/failed
           await tenantPrisma.campaign.update({
             where: { id: campaign.id },
             data: {
               totalCount: targetOldCount,
               successCount: successCount,
               failedCount: failedCount,
               status: 'completed'
             }
           });
           
           console.log(`  Fixed Campaign counts!`);
           console.log(`  New Total Contacts: ${targetOldCount}`);
           console.log(`  New Success: ${successCount}`);
           console.log(`  New Failed: ${failedCount}`);
        } else {
           console.log(`  Expected at least ${targetOldCount} messages but found ${sentMessages.length}.`);
        }
      }

    } catch (e) {
      console.error(`  Error connecting or querying tenant ${tenant.id}:`, e.message);
    } finally {
      await tenantPrisma.$disconnect();
    }
  }
  console.log(`\n======================================================`);
  console.log('Fix finished.');
}

main()
  .catch(e => console.error(e))
  .finally(() => centralPrisma.$disconnect());
