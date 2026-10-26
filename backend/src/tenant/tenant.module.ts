import { Module, Global } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { PrismaService } from '../prisma.service';

@Global()
@Module({
  providers: [TenantPrismaService, CentralPrismaService, PrismaService],
  exports: [TenantPrismaService, CentralPrismaService, PrismaService],
})
export class TenantModule {}
