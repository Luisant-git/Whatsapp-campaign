import { Controller, Get, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { FlowAppointmentService } from './flow-appointment.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('flow-appointments')
export class FlowAppointmentController {
  constructor(private readonly flowAppointmentService: FlowAppointmentService) {}

  @Get()
  @UseGuards(SessionGuard)
  async getAppointments(@Req() req: any) {
    const userId = req.session.userId || req.session.user?.id;
    return this.flowAppointmentService.getAppointments(userId);
  }

  @Post('exchange')
  @HttpCode(200)
  async handleFlowExchange(@Body() body: any) {
    console.log('Flow exchange received:', JSON.stringify(body, null, 2));
    
    const { screen, data, version, action } = body;
    
    if (action === 'data_exchange' && screen === 'SUMMARY') {
      try {
        await this.flowAppointmentService.saveAppointmentFromFlow(data);
        
        return {
          version: '3.0',
          screen: 'SUCCESS',
          data: {}
        };
      } catch (error) {
        console.error('Error saving appointment:', error);
        return {
          version: '3.0',
          screen: 'SUMMARY',
          data: {
            error_message: 'Sorry, we couldn\'t book your appointment. Please try again.'
          }
        };
      }
    }
    
    return { version: '3.0', screen, data };
  }
}
