import { PrismaClient as CentralPrisma } from '@prisma/client-central';
import { execSync } from 'child_process';

async function updateTenantDatabases() {
  const centralPrisma = new CentralPrisma();
  
  try {
    const tenants = await centralPrisma.tenant.findMany();
    
    console.log(`Found ${tenants.length} tenants to update`);
    
    for (const tenant of tenants) {
      console.log(`\nUpdating database for tenant: ${tenant.email}`);
      
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      
      try {
        process.env.TENANT_DATABASE_URL = dbUrl;
        execSync('npx prisma db push --schema=./prisma/schema-tenant.prisma --skip-generate', {
          stdio: 'inherit',
        });
        console.log(`✓ Successfully updated ${tenant.dbName}`);
      } catch (error) {
        console.error(`✗ Failed to update ${tenant.dbName}:`, error.message);
      }
    }
    
    console.log('\n✓ All tenant databases updated!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await centralPrisma.$disconnect();
  }
}

updateTenantDatabases();
