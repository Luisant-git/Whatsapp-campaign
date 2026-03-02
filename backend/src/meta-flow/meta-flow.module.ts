import { Module } from '@nestjs/common';
import { MetaFlowController } from './meta-flow.controller';
import { MetaFlowService } from './meta-flow.service';

@Module({
  controllers: [MetaFlowController],
  providers: [MetaFlowService],
})
export class MetaFlowModule {}
