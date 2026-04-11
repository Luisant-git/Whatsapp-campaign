const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');

async function testMetaLeads() {
  const centralPrisma = new CentralPrismaClient();

  try {
    const tenants = await centralPrisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, dbName: true, dbHost: true, dbPort: true, dbUser: true, dbPassword: true }
    });

    console.log('Testing tenant databases for MetaLead table...\n');

    for (const tenant of tenants) {
      console.log(`\nTenant: ${tenant.name} (ID: ${tenant.id})`);
      
      const { Client } = require('pg');
      const client = new Client({
        host: tenant.dbHost,
        port: tenant.dbPort,
        database: tenant.dbName,
        user: tenant.dbUser,
        password: tenant.dbPassword,
      });

      try {
        await client.connect();
        
        // Check if MetaLead table exists
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'MetaLead'
          );
        `);
        
        const tableExists = tableCheck.rows[0].exists;
        console.log(`  MetaLead table exists: ${tableExists}`);
        
        if (tableExists) {
          const countResult = await client.query('SELECT COUNT(*) FROM "MetaLead"');
          console.log(`  MetaLead records: ${countResult.rows[0].count}`);
        }
        
        await client.end();
      } catch (error) {
        console.error(`  Error: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await centralPrisma.$disconnect();
  }
}

testMetaLeads();
