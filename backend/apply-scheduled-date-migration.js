/**
 * Adds the scheduledDate column to the Campaign table in every tenant DB.
 * Run once on the server: node apply-scheduled-date-migration.js
 */
const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { Client } = require('pg');

const centralPrisma = new CentralPrismaClient();

const SQL = `
ALTER TABLE "Campaign"
  ADD COLUMN IF NOT EXISTS "scheduledDate" TIMESTAMP(3);
`;

async function run() {
  try {
    console.log('🔍 Fetching all active tenants...');
    const tenants = await centralPrisma.tenant.findMany({
      where: { isActive: true },
    });
    console.log(`✅ Found ${tenants.length} active tenants\n`);

    let success = 0;
    let failed = 0;

    for (const tenant of tenants) {
      console.log(`📦 Tenant: ${tenant.name} (${tenant.dbName})`);
      const client = new Client({
        host: tenant.dbHost,
        port: tenant.dbPort,
        database: tenant.dbName,
        user: tenant.dbUser,
        password: tenant.dbPassword,
      });

      try {
        await client.connect();
        await client.query(SQL);
        await client.end();
        console.log(`  ✓ scheduledDate column added/confirmed\n`);
        success++;
      } catch (err) {
        console.error(`  ✗ Error: ${err.message}\n`);
        failed++;
        try { await client.end(); } catch (_) {}
      }
    }

    console.log(`\n🏁 Done — ${success} succeeded, ${failed} failed.`);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  } finally {
    await centralPrisma.$disconnect();
  }
}

run();
