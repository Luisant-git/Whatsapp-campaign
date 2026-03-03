import { Module } from '@nestjs/common';
import { FlowMessageController } from './flow-message.controller';
import { FlowMessageService } from './flow-message.service';

@Module({
  controllers: [FlowMessageController],
  providers: [FlowMessageService],
  exports: [FlowMessageService]
})
export class FlowMessageModule {}