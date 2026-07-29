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
    if (tenant.id !== 6) continue;
    
    console.log(`\n======================================================`);
    console.log(`Fixing names and errors for Tenant ${tenant.id} (${tenant.companyName || tenant.email})`);
    
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
    
    const tenantPrisma = new TenantPrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    try {
      await tenantPrisma.$connect();
      
      const campaigns = await tenantPrisma.campaign.findMany({
        where: { name: 'job_offer_snp' }
      });
      
      if (campaigns.length === 0) continue;
      
      for (const campaign of campaigns) {
        console.log(`  Processing Campaign ID: ${campaign.id}`);
        
        const campaignContacts = await tenantPrisma.campaignContact.findMany({
          where: { campaignId: campaign.id }
        });
        
        const globalContacts = await tenantPrisma.contact.findMany();
        
        const nameMap = new Map<string, string>();
        
        // Advanced phone format to match with or without country code (91)
        const formatPhone = (p: string) => {
          let clean = p.replace(/[^0-9]/g, '');
          if (clean.length === 12 && clean.startsWith('91')) {
            clean = clean.substring(2);
          }
          return clean;
        };
        
        for (const gc of globalContacts) {
           nameMap.set(formatPhone(gc.phone), gc.name);
        }
        
        for (const cc of campaignContacts) {
           if (cc.name && cc.name.trim() !== '' && cc.name !== 'Unknown') {
             nameMap.set(formatPhone(cc.phone), cc.name);
           }
        }
        
        // Fix names and set default error reason
        const messages = await tenantPrisma.campaignMessage.findMany({
          where: { campaignId: campaign.id }
        });
        
        let fixedNamesCount = 0;
        let fixedErrorsCount = 0;
        
        for (const msg of messages) {
           let updateData: any = {};
           
           // Check name
           if (msg.name === 'Unknown' || !msg.name || msg.name.trim() === '') {
             const cleanPhone = formatPhone(msg.phone);
             const realName = nameMap.get(cleanPhone) || nameMap.get(msg.phone) || nameMap.get(`91${cleanPhone}`);
             if (realName && realName !== 'Unknown') {
               updateData.name = realName;
               fixedNamesCount++;
             }
           }
           
           // Check error for FAILED status
           if (msg.status === 'failed' && (!msg.error || msg.error === '-')) {
             updateData.error = "Error logs cleared by re-run";
             fixedErrorsCount++;
           }
           
           if (Object.keys(updateData).length > 0) {
             await tenantPrisma.campaignMessage.update({
               where: { id: msg.id },
               data: updateData
             });
           }
        }
        
        console.log(`  Successfully fixed ${fixedNamesCount} names!`);
        console.log(`  Successfully updated ${fixedErrorsCount} missing error reasons.`);
      }

    } catch (e) {
      console.error(`  Error connecting or querying tenant ${tenant.id}:`, e.message);
    } finally {
      await tenantPrisma.$disconnect();
    }
  }
  console.log(`\n======================================================`);
  console.log('Final fix finished.');
}

main()
  .catch(e => console.error(e))
  .finally(() => centralPrisma.$disconnect());
