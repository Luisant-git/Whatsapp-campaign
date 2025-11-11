import { Module } from '@nestjs/common';
import { WhatsappSessionService } from './whatsapp-session.service';
import { AutoReplyModule } from '../auto-reply.module';

@Module({
  imports: [AutoReplyModule],
  providers: [WhatsappSessionService],
  exports: [WhatsappSessionService]
})
export class WhatsappSessionModule {}