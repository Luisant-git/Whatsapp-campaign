import { Module } from '@nestjs/common';
import { FlowManagerService } from './flow-manager.service';
import { AppointmentFlowHandler } from './appointment.flow';
import { FeedbackFlowHandler } from './feedback.flow';
import { LeadFlowHandler } from './lead.flow';
import { FlowAppointmentModule } from '../../flow-appointment/flow-appointment.module';

@Module({
  imports: [FlowAppointmentModule],
  providers: [
    FlowManagerService,
    AppointmentFlowHandler,
    FeedbackFlowHandler,
    LeadFlowHandler,
  ],
  exports: [
    FlowManagerService,
    AppointmentFlowHandler,
    FeedbackFlowHandler,
    LeadFlowHandler,
  ],
})
export class FlowsModule {}