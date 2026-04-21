const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const centralPrisma = new CentralPrismaClient();

  try {
    console.log('🔍 Fetching all active tenants...');
    const tenants = await centralPrisma.tenant.findMany({
      where: { isActive: true }
    });

    console.log(`✅ Found ${tenants.length} active tenants\n`);

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'prisma', 'migrations', 'add-campaign-name-to-meta-leads.sql'),
      'utf8'
    );

    for (const tenant of tenants) {
      console.log(`📊 Applying migration to tenant: ${tenant.name} (ID: ${tenant.id})`);
      
      const client = new Client({
        host: tenant.dbHost,
        port: tenant.dbPort,
        database: tenant.dbName,
        user: tenant.dbUser,
        password: tenant.dbPassword,
      });

      try {
        await client.connect();
        await client.query(migrationSQL);
        console.log(`   ✅ Migration applied successfully\n`);
      } catch (error) {
        console.error(`   ❌ Error applying migration:`, error.message);
      } finally {
        await client.end();
      }
    }

    console.log('🎉 Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await centralPrisma.$disconnect();
  }
}

applyMigration();
