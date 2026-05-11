const { PrismaClient } = require('@prisma/client-central');

const centralPrisma = new PrismaClient({
  datasources: { db: { url: process.env.CENTRAL_DATABASE_URL } },
});

const { Client } = require('pg');

async function runMigrationOnTenant(tenant) {
  const client = new Client({
    host: tenant.dbHost,
    port: tenant.dbPort,
    user: tenant.dbUser,
    password: tenant.dbPassword,
    database: tenant.dbName,
  });

  try {
    await client.connect();
    console.log(`\n✅ Connected to tenant ${tenant.id} (${tenant.dbName})`);

    // Step 1: Remove duplicates
    const del = await client.query(`
      DELETE FROM "Contact"
      WHERE id NOT IN (
        SELECT MIN(id) FROM "Contact" GROUP BY phone
      )
    `);
    console.log(`   Deleted ${del.rowCount} duplicate contacts`);

    // Step 2: Drop old composite unique index
    await client.query(`DROP INDEX IF EXISTS "Contact_phone_phoneNumberId_key"`);
    console.log(`   Dropped old composite index`);

    // Step 3: Add new unique constraint on phone
    await client.query(`
      ALTER TABLE "Contact" 
      ADD CONSTRAINT "Contact_phone_key" UNIQUE ("phone")
    `).catch(err => {
      if (err.message.includes('already exists')) {
        console.log(`   Constraint already exists, skipping`);
      } else {
        throw err;
      }
    });
    console.log(`   Added unique constraint on phone`);

  } catch (err) {
    console.error(`❌ Failed for tenant ${tenant.id} (${tenant.dbName}):`, err.message);
  } finally {
    await client.end();
  }
}

async function main() {
  try {
    const tenants = await centralPrisma.tenant.findMany({
      where: { isActive: true },
    });

    console.log(`Found ${tenants.length} active tenants`);

    for (const tenant of tenants) {
      await runMigrationOnTenant(tenant);
    }

    console.log('\n✅ Migration completed on all tenants');
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await centralPrisma.$disconnect();
  }
}

main();
