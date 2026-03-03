import { Module } from '@nestjs/common';
import { FlowMessageController } from './flow-message.controller';
import { FlowMessageService } from './flow-message.service';
import { FlowTriggerService } from './flow-trigger.service';
import { TenantPrismaService } from '../tenant-prisma.service';

@Module({
  controllers: [FlowMessageController],
  providers: [FlowMessageService, FlowTriggerService, TenantPrismaService],
  exports: [FlowMessageService, FlowTriggerService]
})
export class FlowMessageModule {}