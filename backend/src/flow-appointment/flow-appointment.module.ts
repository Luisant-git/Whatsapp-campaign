import { Module } from '@nestjs/common';
import { FlowAppointmentController } from './flow-appointment.controller';
import { FlowAppointmentService } from './flow-appointment.service';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [FlowAppointmentController],
  providers: [FlowAppointmentService],
  exports: [FlowAppointmentService],
})
export class FlowAppointmentModule {}
