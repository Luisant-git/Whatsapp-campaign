const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function applyMetaLeadsMigration() {
  const centralPrisma = new CentralPrismaClient();

  try {
    console.log('🔍 Fetching all tenants...');
    const tenants = await centralPrisma.tenant.findMany({
      where: { isActive: true },
    });

    console.log(`✅ Found ${tenants.length} active tenants\n`);

    for (const tenant of tenants) {
      try {
        console.log(`📦 Processing tenant: ${tenant.name} (${tenant.domain})`);

        // Set the database URL as environment variable
        const env = {
          ...process.env,
          TENANT_DATABASE_URL: tenant.databaseUrl,
        };

        // Run Prisma db push to sync schema
        console.log(`  ⏳ Running Prisma db push...`);
        const { stdout, stderr } = await execPromise(
          'npx prisma db push --schema=./prisma/schema-tenant.prisma --skip-generate',
          { env }
        );

        if (stderr && !stderr.includes('warnings')) {
          console.log(`  ⚠️  Warnings: ${stderr}`);
        }
        
        console.log(`  ✓ Migration applied successfully\n`);
      } catch (error) {
        console.error(`  ✗ Error for tenant ${tenant.name}:`, error.message);
      }
    }

    console.log('✅ Migration completed for all tenants!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await centralPrisma.$disconnect();
  }
}

applyMetaLeadsMigration();
