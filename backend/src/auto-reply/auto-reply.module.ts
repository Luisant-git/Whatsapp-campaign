import { Module } from '@nestjs/common';
import { AutoReplyService } from './auto-reply.service';
import { AutoReplyController } from './auto-reply.controller';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  controllers: [AutoReplyController],
  providers: [AutoReplyService, TenantPrismaService, CentralPrismaService],
  exports: [AutoReplyService],
})
export class AutoReplyModule {}
