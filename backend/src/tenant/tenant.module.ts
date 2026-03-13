import { Module, Global } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
// import { DomainTenantMiddleware } from './domain-tenant.middleware';

@Global()
@Module({
  providers: [TenantPrismaService, CentralPrismaService],
  exports: [TenantPrismaService, CentralPrismaService],
})
export class TenantModule {}
