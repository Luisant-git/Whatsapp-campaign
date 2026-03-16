import { Module } from '@nestjs/common';
import { FlowMessageController } from './flow-message.controller';
import { FlowMessageService } from './flow-message.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  controllers: [FlowMessageController],
  providers: [FlowMessageService, TenantPrismaService, CentralPrismaService],
  exports: [FlowMessageService],
})
export class FlowMessageModule {}