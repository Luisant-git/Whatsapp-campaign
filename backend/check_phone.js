const { PrismaClient } = require('@prisma/client-central');
const { PrismaClient: TenantPrisma } = require('@prisma/client-tenant');
require('dotenv').config();

async function main() {
  const central = new PrismaClient({ datasources: { db: { url: process.env.CENTRAL_DATABASE_URL } } });
  
  try {
    const tenants = await central.tenant.findMany({ where: { isActive: true } });
    console.log(`Checking ${tenants.length} tenants for Phone ID: 102588026101837...`);
    
    for (const tenant of tenants) {
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
      const tClient = new TenantPrisma({ datasources: { db: { url: dbUrl } } });
      
      try {
        const settings = await tClient.whatsAppSettings.findMany({ where: { phoneNumberId: '102588026101837' } });
        const master = await tClient.masterConfig.findMany({ where: { phoneNumberId: '102588026101837' } });
        
        if (settings.length > 0) {
          console.log(`✅ Tenant ${tenant.id} (${tenant.email}) has it in WhatsAppSettings!`);
        }
        if (master.length > 0) {
          console.log(`✅ Tenant ${tenant.id} (${tenant.email}) has it in MasterConfig!`);
        }
      } catch(e) {
        // ignore errors for tenants that might be uninitialized
      } finally {
        await tClient.$disconnect();
      }
    }
  } finally {
    await central.$disconnect();
  }
}
main();
