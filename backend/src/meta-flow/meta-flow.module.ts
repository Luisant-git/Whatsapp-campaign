import { Module } from '@nestjs/common';
import { MetaFlowController } from './meta-flow.controller';
import { MetaFlowService } from './meta-flow.service';
import { FlowDataController } from './flow-data.controller';
import { FlowAppointmentModule } from '../flow-appointment/flow-appointment.module';
import { FlowsModule } from '../whatsapp/flows/flows.module';

@Module({
  imports: [FlowAppointmentModule, FlowsModule],
  controllers: [MetaFlowController, FlowDataController],
  providers: [MetaFlowService],
})
export class MetaFlowModule {}
