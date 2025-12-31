import { Module } from '@nestjs/common';
import { QuickReplyService } from './quick-reply.service';
import { QuickReplyController } from './quick-reply.controller';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [QuickReplyController],
  providers: [QuickReplyService, PrismaService],
  exports: [QuickReplyService],
})
export class QuickReplyModule {}