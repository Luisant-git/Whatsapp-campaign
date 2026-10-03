const { PrismaClient } = require('@prisma/client-tenant');
const db = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:root@localhost:5432/tenent_db?schema=public' }
  }
});

async function main() {
  console.log("Looking for failed step 3 logs...");
  const failedLogs = await db.metaLeadAutomationLog.findMany({
    where: {
      status: 'failed',
      stepIndex: 3
    },
    select: { metaLeadId: true }
  });

  const leadIds = [...new Set(failedLogs.map(l => l.metaLeadId))];
  console.log(`Found ${leadIds.length} unique leads that failed step 3.`);

  if (leadIds.length > 0) {
    const updated = await db.metaLead.updateMany({
      where: { id: { in: leadIds } },
      data: { lastAutomationStep: 2 } 
    });
    console.log(`Reset lastAutomationStep to 2 for ${updated.count} leads.`);

    const deleted = await db.metaLeadAutomationLog.deleteMany({
      where: {
        metaLeadId: { in: leadIds },
        stepIndex: 3
      }
    });
    console.log(`Deleted ${deleted.count} failed step 3 logs.`);
  }

  db.$disconnect();
}

main().catch(console.error);
