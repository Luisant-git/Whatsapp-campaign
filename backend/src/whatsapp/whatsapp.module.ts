import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { CampaignService } from './campaign.service';
import { SchedulerService } from './scheduler.service';
import { WhatsappController } from './whatsapp.controller';
import { PrismaService } from '../prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { WhatsappSessionModule } from '../whatsapp-session/whatsapp-session.module';
import { SettingsModule } from '../settings/settings.module';
import { ChatbotService } from '../chatbot/chatbot.service';

@Module({
  imports: [WhatsappSessionModule, SettingsModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, CampaignService, SchedulerService, PrismaService, TenantPrismaService, CentralPrismaService, ChatbotService],
  exports: [WhatsappService, CampaignService, SchedulerService]
})
export class WhatsappModule {}