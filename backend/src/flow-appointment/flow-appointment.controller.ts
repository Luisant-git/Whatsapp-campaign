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
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    console.log('Flow exchange received:', JSON.stringify(body, null, 2));
    
    const { screen, data, version, action, flow_token } = body;
    
    // Handle ping request
    if (action === 'ping') {
      return res.status(200).json({
        version: '3.0',
        data: {}
      });
    }
    
    if (action === 'data_exchange' && screen === 'SUMMARY') {
      try {
        await this.flowAppointmentService.saveAppointmentFromFlow(data);
        
        return res.status(200).json({
          version: '3.0',
          screen: 'SUCCESS',
          data: {},
          ...(flow_token && { flow_token })
        });
      } catch (error) {
        console.error('Error saving appointment:', error);
        return res.status(200).json({
          version: '3.0',
          screen: 'SUMMARY',
          data: {
            error_message: 'Sorry, we couldn\'t book your appointment. Please try again.'
          }
        });
      }
    }
    
    return res.status(200).json({ version: '3.0', screen, data });
  }
}
