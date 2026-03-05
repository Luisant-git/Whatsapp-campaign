import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { CampaignService } from './campaign.service';
import { SchedulerService } from './scheduler.service';
import { WhatsappController } from './whatsapp.controller';
import { PhoneRouterService } from './phone-router.service';
import { PrismaService } from '../prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { WhatsappSessionModule } from '../whatsapp-session/whatsapp-session.module';
import { SettingsModule } from '../settings/settings.module';
import { ChatbotService } from '../chatbot/chatbot.service';
import { EcommerceModule } from '../ecommerce/ecommerce.module';
import { FlowMessageModule } from '../flow-message/flow-message.module';
import { FlowAppointmentModule } from '../flow-appointment/flow-appointment.module';

@Module({
  imports: [WhatsappSessionModule, SettingsModule, EcommerceModule, FlowMessageModule, FlowAppointmentModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, CampaignService, SchedulerService, PhoneRouterService, PrismaService, TenantPrismaService, CentralPrismaService, ChatbotService],
  exports: [WhatsappService, CampaignService, SchedulerService]
})
export class WhatsappModule {}