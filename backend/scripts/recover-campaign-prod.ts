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
    console.log(`Fixing names for Tenant ${tenant.id} (${tenant.companyName || tenant.email})`);
    
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
        console.log(`  Processing Campaign ID: ${campaign.id}`);
        
        // Fetch the original contacts for this campaign to get their real names
        const campaignContacts = await tenantPrisma.campaignContact.findMany({
          where: { campaignId: campaign.id }
        });
        
        // Also fetch from the master Contact table as a fallback
        const globalContacts = await tenantPrisma.contact.findMany();
        
        // Create lookup maps for fast access
        const nameMap = new Map<string, string>();
        
        // Format phone number utility to ensure matching
        const formatPhone = (p: string) => p.replace(/[^0-9]/g, '');
        
        // 1. Populate from global contacts first (as fallback)
        for (const gc of globalContacts) {
           nameMap.set(formatPhone(gc.phone), gc.name);
        }
        
        // 2. Populate from campaign contacts (highest priority)
        for (const cc of campaignContacts) {
           if (cc.name && cc.name.trim() !== '' && cc.name !== 'Unknown') {
             nameMap.set(formatPhone(cc.phone), cc.name);
           }
        }
        
        // Fetch all campaign messages that currently say "Unknown"
        const unknownMessages = await tenantPrisma.campaignMessage.findMany({
          where: { 
            campaignId: campaign.id,
            OR: [
              { name: 'Unknown' },
              { name: null },
              { name: '' }
            ]
          }
        });
        
        console.log(`  Found ${unknownMessages.length} messages with 'Unknown' names.`);
        
        let fixedCount = 0;
        
        // Fix the names!
        for (const msg of unknownMessages) {
           const cleanPhone = formatPhone(msg.phone);
           const realName = nameMap.get(cleanPhone) || nameMap.get(msg.phone);
           
           if (realName && realName !== 'Unknown') {
             await tenantPrisma.campaignMessage.update({
               where: { id: msg.id },
               data: { name: realName }
             });
             fixedCount++;
           }
        }
        
        console.log(`  Successfully fixed ${fixedCount} names!`);
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
