import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CentralPrismaService } from '../src/central-prisma.service';
import { TenantPrismaService } from '../src/tenant-prisma.service';

async function bootstrap() {
  console.log('Initializing Application Context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const centralPrisma = app.get(CentralPrismaService);
  const tenantPrisma = app.get(TenantPrismaService);

  console.log('Starting full reset of Meta Lead Automation (rules, logs, and lead states)...');

  const activeTenants = await centralPrisma.tenant.findMany();
  
  for (const tenant of activeTenants) {
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    console.log(`\nProcessing Tenant ${tenant.id} (${tenant.companyName || 'Unknown'})...`);
    
    try {
      const client = await tenantPrisma.getTenantClientReady(String(tenant.id), dbUrl) as any;
      
      try {
        const rulesDeleted = await client.metaLeadAutomation.deleteMany({});
        console.log(`  Deleted ${rulesDeleted.count} MetaLeadAutomation rules.`);
      } catch (e: any) { console.error(`  Error deleting rules:`, e.message); }

      try {
        const metaLogsDeleted = await client.metaLeadAutomationLog.deleteMany({});
        console.log(`  Deleted ${metaLogsDeleted.count} MetaLeadAutomationLog records.`);
      } catch (e: any) { console.error(`  Error deleting meta logs:`, e.message); }

      try {
        const contactLogsDeleted = await client.contactAutomationLog.deleteMany({});
        console.log(`  Deleted ${contactLogsDeleted.count} ContactAutomationLog records.`);
      } catch (e: any) { console.error(`  Error deleting contact logs:`, e.message); }

      try {
        const metaLeadsReset = await client.metaLead.updateMany({
          data: { 
            lastAutomationStep: 0,
            isAutomationSent: false,
            automationSentAt: null
          }
        });
        console.log(`  Reset ${metaLeadsReset.count} MetaLead states.`);
      } catch (e: any) { console.error(`  Error resetting MetaLeads:`, e.message); }

      try {
        const contactsReset = await client.contact.updateMany({
          data: { 
            lastAutomationStep: 0,
            isAutomationSent: false,
            automationSentAt: null
          }
        });
        console.log(`  Reset ${contactsReset.count} Contact states.`);
      } catch (e: any) { console.error(`  Error resetting Contacts:`, e.message); }

    } catch (e: any) {
      console.error(`  Error processing Tenant ${tenant.id}:`, e.message);
    }
  }

  console.log('\nFull reset complete! You can now start freshly.');
  await app.close();
}

bootstrap();
