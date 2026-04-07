import { Module } from '@nestjs/common';
import { FlowAppointmentController } from './flow-appointment.controller';
import { FlowAppointmentService } from './flow-appointment.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [FlowAppointmentController],
  providers: [FlowAppointmentService, TenantPrismaService, CentralPrismaService],
  exports: [FlowAppointmentService],
})
export class FlowAppointmentModule {}
