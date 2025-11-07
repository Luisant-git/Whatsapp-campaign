import { Module } from '@nestjs/common';
import { WhatsappSessionService } from './whatsapp-session.service';

@Module({
  providers: [WhatsappSessionService],
  exports: [WhatsappSessionService]
})
export class WhatsappSessionModule {}