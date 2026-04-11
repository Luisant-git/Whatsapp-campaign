const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

function parsePostgresUrl(urlString) {
  try {
    // Handle case where URL might not have protocol
    if (!urlString.startsWith('postgres://') && !urlString.startsWith('postgresql://')) {
      urlString = 'postgresql://' + urlString;
    }
    
    const url = new URL(urlString);
    return {
      host: url.hostname,
      port: url.port || 5432,
      database: url.pathname.slice(1).split('?')[0], // Remove query params from db name
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: url.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : false,
    };
  } catch (error) {
    console.error('Failed to parse URL:', urlString);
    console.error('Error:', error.message);
    return null;
  }
}

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
        console.log(`📦 Processing tenant: ${tenant.name} (${tenant.domain || 'no domain'})`);

        const config = parsePostgresUrl(tenant.databaseUrl);
        if (!config) {
          console.log(`  ✗ Failed to parse database URL\n`);
          continue;
        }

        const client = new Client(config);

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
