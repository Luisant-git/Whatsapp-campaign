import { Controller, Get, Post, Body, UseGuards, Req, HttpCode, Res } from '@nestjs/common';
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
  async handleFlowExchange(@Body() body: any, @Res() res: any) {
    console.log('Flow exchange received:', JSON.stringify(body, null, 2));
    
    const { screen, data, version, action, flow_token } = body;
    
    // Handle ping request
    if (action === 'ping') {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        version: '3.0',
        data: {}
      });
    }
    
    if (action === 'data_exchange' && screen === 'SUMMARY') {
      try {
        await this.flowAppointmentService.saveAppointmentFromFlow(data);
        
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
          version: '3.0',
          screen: 'SUCCESS',
          data: {},
          ...(flow_token && { flow_token })
        });
      } catch (error) {
        console.error('Error saving appointment:', error);
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
          version: '3.0',
          screen: 'SUMMARY',
          data: {
            error_message: 'Sorry, we couldn\'t book your appointment. Please try again.'
          }
        });
      }
    }
    
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ version: '3.0', screen, data });
  }
}
