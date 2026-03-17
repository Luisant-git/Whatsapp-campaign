import { Module } from '@nestjs/common';
import { FlowManagerService } from './flow-manager.service';
import { AppointmentFlowHandler } from './appointment.flow';
import { FeedbackFlowHandler } from './feedback.flow';
import { LeadFlowHandler } from './lead.flow';
import { CustomerDetailsFlowHandler } from './customer-details.flow';
import { FlowAppointmentModule } from '../../flow-appointment/flow-appointment.module';
import { TenantPrismaService } from '../../tenant-prisma.service';
import { CentralPrismaService } from '../../central-prisma.service';

@Module({
  imports: [FlowAppointmentModule],
  providers: [
    FlowManagerService,
    AppointmentFlowHandler,
    FeedbackFlowHandler,
    LeadFlowHandler,
    CustomerDetailsFlowHandler,
    TenantPrismaService,
    CentralPrismaService,
  ],
  exports: [
    FlowManagerService,
    AppointmentFlowHandler,
    FeedbackFlowHandler,
    LeadFlowHandler,
    CustomerDetailsFlowHandler,
  ],
})
export class FlowsModule {}