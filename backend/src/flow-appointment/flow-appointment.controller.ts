import { Controller, Get, Post, Body, UseGuards, Req, HttpCode, Res, Delete, Param } from '@nestjs/common';
import { FlowAppointmentService } from './flow-appointment.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('flow-appointments')
export class FlowAppointmentController {
  constructor(private readonly flowAppointmentService: FlowAppointmentService) {}

  @Get()
  @UseGuards(SessionGuard)
  async getAppointments(@Req() req: any) {
    const userId = req.session.userId || req.session.user?.id;
    const appointments = await this.flowAppointmentService.getAppointments(userId);
    return {
      success: true,
      appointments: appointments || []
    };
  }

  @Delete(':id')
  @UseGuards(SessionGuard)
  async deleteAppointment(@Param('id') id: string, @Req() req: any) {
    const userId = req.session.userId || req.session.user?.id;
    try {
      await this.flowAppointmentService.deleteAppointment(parseInt(id), userId);
      return {
        success: true,
        message: 'Appointment deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete appointment'
      };
    }
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
    
    const { screen, data, action, flow_token } = body;
    
    // Handle ping request
    if (action === 'ping') {
      return res.status(200).json({
        screen: 'APPOINTMENT',
        data: {}
      });
    }
    
    // Handle INIT action - provide initial data for the flow
    if (action === 'INIT') {
      try {
        // Extract tenant ID from flow token if available
        let tenantId: number | undefined;
        if (flow_token) {
          const tokenParts = flow_token.split('_');
          if (tokenParts.length >= 3) {
            tenantId = parseInt(tokenParts[2]);
          }
        }

        const appointmentData = await this.flowAppointmentService.getCompleteAppointmentData(tenantId);
        
        console.log('Providing initial data:', appointmentData);
        
        return res.status(200).json({
          screen: 'APPOINTMENT',
          data: appointmentData
        });
      } catch (error) {
        console.error('Error getting initial data:', error);
        return res.status(200).json({
          screen: 'APPOINTMENT',
          data: {
            departments: [],
            locations: [],
            dates: [],
            time_slots: []
          }
        });
      }
    }
    
    if (action === 'data_exchange' && screen === 'SUMMARY') {
      try {
        console.log('🔍 SUMMARY screen data exchange - Full body:', JSON.stringify(body, null, 2));
        console.log('🔍 Data field:', JSON.stringify(data, null, 2));
        
        await this.flowAppointmentService.saveAppointmentFromFlow(data);
        
        return res.status(200).json({
          screen: 'SUCCESS',
          data: {}
        });
      } catch (error) {
        console.error('Error saving appointment:', error);
        return res.status(200).json({
          screen: 'SUMMARY',
          data: {
            error_message: 'Sorry, we couldn\'t book your appointment. Please try again.'
          }
        });
      }
    }
    
    return res.status(200).json({ screen, data });
  }
}
