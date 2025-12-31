import { Module } from '@nestjs/common';
import { WhatsappSessionService } from './whatsapp-session.service';
import { AutoReplyModule } from '../auto-reply.module';
import { QuickReplyModule } from '../quick-reply.module';

@Module({
  imports: [AutoReplyModule, QuickReplyModule],
  providers: [WhatsappSessionService],
  exports: [WhatsappSessionService]
})
export class WhatsappSessionModule {}