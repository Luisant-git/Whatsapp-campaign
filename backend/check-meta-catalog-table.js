const { PrismaClient: CentralPrismaClient } = require('@prisma/client-central');
const { Client } = require('pg');

const centralPrisma = new CentralPrismaClient();

async function checkTable() {
  try {
    console.log('🔍 Checking MetaCatalogConfig table in tenant databases...\n');
    const tenants = await centralPrisma.tenant.findMany();

    for (const tenant of tenants) {
      console.log(`📦 Checking tenant: ${tenant.companyName} (ID: ${tenant.id})`);
      
      const connectionString = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const client = new Client({ connectionString });

      try {
        await client.connect();
        
        // Check if table exists
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'MetaCatalogConfig'
          );
        `);
        
        const tableExists = result.rows[0].exists;
        
        if (tableExists) {
          console.log(`  ✓ MetaCatalogConfig table EXISTS`);
          
          // Check if there's any data
          const dataResult = await client.query('SELECT * FROM "MetaCatalogConfig"');
          console.log(`  ✓ Records in table: ${dataResult.rows.length}`);
          if (dataResult.rows.length > 0) {
            console.log(`  ✓ Data:`, dataResult.rows);
          }
        } else {
          console.log(`  ✗ MetaCatalogConfig table DOES NOT EXIST`);
        }
        
        await client.end();
        console.log('');
      } catch (error) {
        console.error(`  ✗ Error for tenant ${tenant.companyName}:`, error.message);
        try {
          await client.end();
        } catch (e) {}
      }
    }

    console.log('✅ Check completed!');
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await centralPrisma.$disconnect();
  }
}

checkTable();
