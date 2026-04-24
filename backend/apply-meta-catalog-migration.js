const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const centralPrisma = new CentralPrismaClient();

async function applyMigration() {
  try {
    console.log('🔍 Fetching all tenants...');
    const tenants = await centralPrisma.tenant.findMany();
    console.log(`✅ Found ${tenants.length} tenants\n`);

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'add-meta-catalog-config.sql'),
      'utf8'
    );

    for (const tenant of tenants) {
      console.log(`📦 Processing tenant: ${tenant.companyName} (ID: ${tenant.id})`);
      
      const connectionString = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const client = new Client({ connectionString });

      try {
        await client.connect();
        console.log(`  ✓ Connected to database: ${tenant.dbName}`);
        
        await client.query(migrationSQL);
        console.log(`  ✓ Migration applied successfully`);
        
        await client.end();
        console.log(`  ✓ Connection closed\n`);
      } catch (error) {
        console.error(`  ✗ Error for tenant ${tenant.companyName}:`, error.message);
        try {
          await client.end();
        } catch (e) {
          // Ignore connection close errors
        }
      }
    }

    console.log('✅ Migration completed for all tenants!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await centralPrisma.$disconnect();
  }
}

applyMigration();
