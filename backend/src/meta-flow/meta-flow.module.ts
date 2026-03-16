import { Module } from '@nestjs/common';
import { MetaFlowController } from './meta-flow.controller';
import { MetaFlowService } from './meta-flow.service';
import { FlowDataService } from './flow-data.service';
import { FlowAppointmentModule } from '../flow-appointment/flow-appointment.module';

@Module({
  imports: [FlowAppointmentModule],
  controllers: [MetaFlowController],
  providers: [MetaFlowService, FlowDataService],
})
export class MetaFlowModule {}
