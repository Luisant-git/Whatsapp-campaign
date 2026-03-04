import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { FlowAppointmentService } from './flow-appointment.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('flow-appointments')
@UseGuards(SessionGuard)
export class FlowAppointmentController {
  constructor(private readonly flowAppointmentService: FlowAppointmentService) {}

  @Get()
  async getAppointments(@Req() req: any) {
    const userId = req.user.userId;
    return this.flowAppointmentService.getAppointments(userId);
  }
}
