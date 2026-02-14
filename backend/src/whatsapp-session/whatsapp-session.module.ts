import { Module, Global } from '@nestjs/common';
import { WhatsappSessionService } from './whatsapp-session.service';
import { AutoReplyModule } from '../auto-reply/auto-reply.module';
import { QuickReplyModule } from '../quick-reply/quick-reply.module';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { PrismaService } from '../prisma.service';

@Global()
@Module({
  imports: [AutoReplyModule, QuickReplyModule],
  providers: [WhatsappSessionService, CentralPrismaService, TenantPrismaService, PrismaService],
  exports: [WhatsappSessionService, CentralPrismaService, TenantPrismaService, PrismaService],
})
export class WhatsappSessionModule {}
