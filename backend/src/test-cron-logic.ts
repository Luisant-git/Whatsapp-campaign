import { PrismaClient } from '@prisma/client-tenant';
async function main() {
  const client = new PrismaClient({ datasources: { db: { url: process.env.TENANT_DATABASE_URL || 'postgresql://postgres:root@localhost:5432/tenant_ragul_17' } } });
  const rules = await client.metaLeadAutomation.findMany({ where: { isActive: true }, orderBy: { delayMinutes: 'asc' } });
  console.log('Active rules:', rules);
  if(rules.length > 0) {
    const pending = await client.contact.findMany({ where: { phone: { not: '' }, groupId: rules[0].groupId, lastAutomationStep: { lt: 1 } } });
    console.log('Pending records count:', pending.length);
    if(pending.length > 0) {
      const now = new Date();
      const delayMs = rules[0].delayMinutes * 60 * 1000;
      const eligible = pending.filter(r => (now.getTime() - r.createdAt.getTime()) >= delayMs);
      console.log('Eligible:', eligible.length, 'Created At:', pending[0].createdAt);
    }
  }
}
main().catch(console.error);
