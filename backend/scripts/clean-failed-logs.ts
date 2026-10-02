import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CentralPrismaService } from '../src/central-prisma.service';
import { TenantPrismaService } from '../src/tenant-prisma.service';

async function bootstrap() {
  console.log('Initializing Application Context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const centralPrisma = app.get(CentralPrismaService);
  const tenantPrisma = app.get(TenantPrismaService);

  console.log('Starting cleanup of failed automation logs...');

  const activeTenants = await centralPrisma.tenant.findMany({ where: { isActive: true } });
  
  for (const tenant of activeTenants) {
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    console.log(`Processing Tenant ${tenant.id} (${tenant.companyName || 'Unknown'})...`);
    
    try {
      const client = await tenantPrisma.getTenantClientReady(String(tenant.id), dbUrl) as any;
      
      const metaLeadDeleted = await client.metaLeadAutomationLog.deleteMany({
        where: { status: 'failed' }
      });
      
      const contactDeleted = await client.contactAutomationLog.deleteMany({
        where: { status: 'failed' }
      });

      console.log(`  Tenant ${tenant.id}: Deleted ${metaLeadDeleted.count} MetaLead logs and ${contactDeleted.count} Contact logs.`);
    } catch (e: any) {
      console.error(`  Error processing Tenant ${tenant.id}:`, e.message);
    }
  }

  console.log('Cleanup complete.');
  await app.close();
}

bootstrap();
