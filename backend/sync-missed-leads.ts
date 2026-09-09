import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MetaLeadsService } from './src/meta-leads/meta-leads.service';
import { TenantPrismaService } from './src/tenant-prisma.service';
import { PrismaClient as CentralPrismaClient } from '@prisma/client-central';

async function bootstrap() {
  console.log('=============================================');
  console.log('🚀 STANDALONE SCRIPT: SYNCING MISSED LEADS');
  console.log('=============================================');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const metaLeadsService = app.get(MetaLeadsService);
  const tenantPrisma = app.get(TenantPrismaService);
  const centralPrisma = new CentralPrismaClient();
  
  try {
    const tenants = await centralPrisma.tenant.findMany({ where: { isActive: true }});
    console.log(`Found ${tenants.length} active tenants.`);
    
    for (const tenant of tenants) {
      console.log(`\n--- Processing Tenant ID: ${tenant.id} ---`);
      try {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const client = await tenantPrisma.getTenantClientReady(tenant.id.toString(), dbUrl) as any;
        
        // Find their Facebook Page credentials
        const metaConfig = await client.metaConfig.findFirst({ where: { isActive: true } });
        if (!metaConfig) {
          console.log(`⏭️ Skipping: No active Meta Config (Facebook Page) connected.`);
          continue;
        }
        
        console.log(`Facebook Page ID: ${metaConfig.pageId}`);
        console.log(`Connecting to Meta Graph API...`);
        
        // This will fetch all forms, grab all leads, and inject the missing ones into the DB
        await metaLeadsService.syncLeadsFromFacebook(
          metaConfig.pageId, 
          'all', 
          metaConfig.accessToken, 
          undefined, 
          tenant.id.toString(), 
          dbUrl
        );
        
        console.log(`✅ Success for Tenant ${tenant.id}`);
        
      } catch (e) {
        console.error(`❌ Failed for Tenant ${tenant.id}:`, e.message);
      }
    }
    
    console.log('\n=============================================');
    console.log('🎉 ALL MISSED LEADS SUCCESSFULLY SYNCED!');
    console.log('=============================================');
  } catch (error) {
    console.error('Fatal Script Error:', error);
  } finally {
    await centralPrisma.$disconnect();
    await app.close();
    process.exit(0);
  }
}

bootstrap();
