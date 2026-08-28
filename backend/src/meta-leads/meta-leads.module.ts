import { Module } from '@nestjs/common';
import { MetaLeadsController } from './meta-leads.controller';
import { MetaLeadsService } from './meta-leads.service';
import { MetaConfigController } from './meta-config.controller';
import { MetaConfigService } from './meta-config.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { MetaLeadsCronService } from './meta-leads-cron.service';

@Module({
  controllers: [MetaLeadsController, MetaConfigController],
  providers: [MetaLeadsService, MetaConfigService, TenantPrismaService, MetaLeadsCronService],
})
export class MetaLeadsModule {}
