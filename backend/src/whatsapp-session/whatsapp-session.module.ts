import { Module, Global } from '@nestjs/common';
import { WhatsappSessionService } from './whatsapp-session.service';
import { AutoReplyModule } from '../auto-reply/auto-reply.module';
import { QuickReplyModule } from '../quick-reply/quick-reply.module';
import { PrismaService } from '../prisma.service';

@Global()
@Module({
  imports: [AutoReplyModule, QuickReplyModule],
  providers: [WhatsappSessionService, PrismaService],
  exports: [WhatsappSessionService, PrismaService],
})
export class WhatsappSessionModule {}
