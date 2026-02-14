import { PrismaClient as CentralPrisma } from '@prisma/client-central';

const centralPrisma = new CentralPrisma();

async function cleanup() {
  console.log('🗑️  Cleaning up old database...\n');

  try {
    // Drop old database
    await centralPrisma.$executeRawUnsafe('DROP DATABASE IF EXISTS whatsapp_campaign');
    console.log('✓ Dropped whatsapp_campaign database');
  } catch (error) {
    console.log('⚠ Old database already removed or does not exist');
  }

  await centralPrisma.$disconnect();
  console.log('\n✅ Cleanup complete!');
  console.log('\n📝 System now uses:');
  console.log('  - whatsapp_central (tenant metadata)');
  console.log('  - tenant_X databases (user data)');
}

cleanup();
