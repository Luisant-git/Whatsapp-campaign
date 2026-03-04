import { Module } from '@nestjs/common';
import { MetaFlowController } from './meta-flow.controller';
import { MetaFlowService } from './meta-flow.service';
import { FlowAppointmentModule } from '../flow-appointment/flow-appointment.module';

@Module({
  imports: [FlowAppointmentModule],
  controllers: [MetaFlowController],
  providers: [MetaFlowService],
})
export class MetaFlowModule {}
