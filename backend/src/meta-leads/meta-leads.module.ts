import { Module } from '@nestjs/common';
import { MetaLeadsController } from './meta-leads.controller';
import { MetaLeadsService } from './meta-leads.service';
import { TenantPrismaService } from '../tenant-prisma.service';

@Module({
  controllers: [MetaLeadsController],
  providers: [MetaLeadsService, TenantPrismaService],
})
export class MetaLeadsModule {}
