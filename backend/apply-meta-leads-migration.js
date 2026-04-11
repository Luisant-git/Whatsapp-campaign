const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMetaLeadsMigration() {
  const centralPrisma = new CentralPrismaClient();

  try {
    console.log('🔍 Fetching all tenants...');
    const tenants = await centralPrisma.tenant.findMany({
      where: { isActive: true },
    });

    console.log(`✅ Found ${tenants.length} active tenants\n`);

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'add-meta-leads-tables.sql'),
      'utf8'
    );

    for (const tenant of tenants) {
      try {
        console.log(`📦 Processing tenant: ${tenant.name} (${tenant.domain})`);

        const client = new Client({
          connectionString: tenant.databaseUrl,
        });

        await client.connect();
        console.log(`  ✓ Connected to database`);

        await client.query(migrationSQL);
        console.log(`  ✓ Migration applied successfully\n`);

        await client.end();
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
