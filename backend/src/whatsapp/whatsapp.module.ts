import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { PrismaService } from '../prisma.service';
import { WhatsappSessionModule } from '../whatsapp-session/whatsapp-session.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [WhatsappSessionModule, SettingsModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, PrismaService],
  exports: [WhatsappService]
})
export class WhatsappModule {}