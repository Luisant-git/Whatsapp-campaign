import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CentralPrismaService } from '../src/central-prisma.service';
import { TenantPrismaService } from '../src/tenant-prisma.service';

async function bootstrap() {
  console.log('Initializing Application Context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const centralPrisma = app.get(CentralPrismaService);
  const tenantPrisma = app.get(TenantPrismaService);

  console.log('Starting reset of lastAutomationStep from 3 back to 2...');

  const activeTenants = await centralPrisma.tenant.findMany({ where: { isActive: true } });
  
  for (const tenant of activeTenants) {
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    console.log(`Processing Tenant ${tenant.id} (${tenant.companyName || 'Unknown'})...`);
    
    try {
      const client = await tenantPrisma.getTenantClientReady(String(tenant.id), dbUrl) as any;
      
      const metaLeadsUpdated = await client.metaLead.updateMany({
        where: { lastAutomationStep: 3 },
        data: { lastAutomationStep: 2 }
      });
      
      const contactsUpdated = await client.contact.updateMany({
        where: { lastAutomationStep: 3 },
        data: { lastAutomationStep: 2 }
      });

      console.log(`  Tenant ${tenant.id}: Reset ${metaLeadsUpdated.count} MetaLeads and ${contactsUpdated.count} Contacts to Step 2.`);
    } catch (e: any) {
      console.error(`  Error processing Tenant ${tenant.id}:`, e.message);
    }
  }

  console.log('Reset complete.');
  await app.close();
}

bootstrap();
