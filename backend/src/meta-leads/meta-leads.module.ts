import { Module } from '@nestjs/common';
import { MetaLeadsController } from './meta-leads.controller';
import { MetaLeadsService } from './meta-leads.service';
import { MetaConfigController } from './meta-config.controller';
import { MetaConfigService } from './meta-config.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { MetaLeadsCronService } from './meta-leads-cron.service';
import { MetaLeadsAutomationCronService } from './meta-leads-automation-cron.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  controllers: [MetaLeadsController, MetaConfigController],
  providers: [MetaLeadsService, MetaConfigService, TenantPrismaService, CentralPrismaService, MetaLeadsCronService, MetaLeadsAutomationCronService],
})
export class MetaLeadsModule {}
