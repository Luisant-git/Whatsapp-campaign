const { PrismaClient } = require('@prisma/client-central');
const prisma = new PrismaClient();

async function fixMenuPermissions() {
  const plans = await prisma.subscriptionPlan.findMany();
  console.log(`Found ${plans.length} plans\n`);

  for (const plan of plans) {
    const perms = plan.menuPermissions || [];
    const missing = [
      'automation',
      'automation.templates',
      'automation.logs',
      'settings.meta-leads-automation',
      'settings.meta-leads-config',
      'campaigns.meta-leads',
    ].filter(p => !perms.includes(p));

    if (missing.length === 0) {
      console.log(`✓ Plan "${plan.name}" already has all permissions`);
      continue;
    }

    const updated = [...perms, ...missing];
    await prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: { menuPermissions: updated },
    });
    console.log(`✅ Plan "${plan.name}" — added: ${missing.join(', ')}`);
  }

  await prisma.$disconnect();
  console.log('\nDone!');
}

fixMenuPermissions().catch(console.error);
