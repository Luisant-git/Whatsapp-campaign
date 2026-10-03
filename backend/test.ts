import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { CentralPrismaService } from './src/central-prisma.service';
import { TenantPrismaService } from './src/tenant-prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const centralPrisma = app.get(CentralPrismaService);
  const tenantPrisma = app.get(TenantPrismaService);

  const tenant = await centralPrisma.tenant.findUnique({ where: { id: 17 } });
  const dbUrl = `postgresql://${tenant!.dbUser}:${tenant!.dbPassword}@${tenant!.dbHost}:${tenant!.dbPort}/${tenant!.dbName}`;
  const client = await tenantPrisma.getTenantClientReady(String(tenant!.id), dbUrl) as any;

  const tpl = await client.messageTemplate.findFirst({ where: { name: 'educate_add_value' } });
  console.log(JSON.stringify(tpl, null, 2));

  await app.close();
}
bootstrap();
