const { PrismaClient } = require('@prisma/client-central');
const { PrismaClient: TenantPrisma } = require('@prisma/client-tenant');
require('dotenv').config();

async function main() {
  const central = new PrismaClient({ datasources: { db: { url: process.env.CENTRAL_DATABASE_URL } } });
  
  try {
    const tenant = await central.tenant.findUnique({ where: { id: 1 } });
    if (!tenant) return console.log('Tenant 1 not found');

    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
    const tClient = new TenantPrisma({ datasources: { db: { url: dbUrl } } });
    
    try {
      const deleted = await tClient.whatsAppSettings.deleteMany({ 
        where: { phoneNumberId: '102588026101837' } 
      });
      console.log(`✅ Successfully deleted ${deleted.count} duplicate configurations from Tenant 1!`);
      console.log('The messages will now correctly route to Tenant 12 (Rathna Vilas)!');
    } catch(e) {
      console.error(e);
    } finally {
      await tClient.$disconnect();
    }
  } finally {
    await central.$disconnect();
  }
}
main();
