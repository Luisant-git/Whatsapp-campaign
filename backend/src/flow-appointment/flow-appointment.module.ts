import { Module } from '@nestjs/common';
import { FlowAppointmentController } from './flow-appointment.controller';
import { FlowAppointmentService } from './flow-appointment.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { FlowMessageModule } from '../flow-message/flow-message.module';

@Module({
  imports: [FlowMessageModule],
  controllers: [FlowAppointmentController],
  providers: [FlowAppointmentService, TenantPrismaService, CentralPrismaService],
  exports: [FlowAppointmentService],
})
export class FlowAppointmentModule {}
