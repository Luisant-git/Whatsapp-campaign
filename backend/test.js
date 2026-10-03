const { PrismaClient: CentralClient } = require('@prisma/client-central');
const { PrismaClient: TenantClient } = require('@prisma/client-tenant');

async function main() {
  const central = new CentralClient({
    datasources: { db: { url: 'postgresql://postgres:root@localhost:5432/whatsapp_campaign?schema=public' } }
  });
  
  const tenant = await central.tenant.findUnique({ where: { id: 17 } });
  if (!tenant) return;
  
  const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
  const tDb = new TenantClient({ datasources: { db: { url: dbUrl } } });
  
  const template = await tDb.messageTemplate.findFirst({
    where: { name: 'educate_add_value' }
  });
  console.log("educate_add_value in Twinsure:", template);

  await central.$disconnect();
  await tDb.$disconnect();
}
main().catch(console.error);
