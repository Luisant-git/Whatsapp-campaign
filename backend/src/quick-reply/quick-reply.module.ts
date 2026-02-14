import { Module } from '@nestjs/common';
import { QuickReplyService } from './quick-reply.service';
import { QuickReplyController } from './quick-reply.controller';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  controllers: [QuickReplyController],
  providers: [QuickReplyService, TenantPrismaService, CentralPrismaService],
  exports: [QuickReplyService],
})
export class QuickReplyModule {}
