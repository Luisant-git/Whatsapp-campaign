import { Controller, Get, Post, Body, UseGuards, Req, HttpCode, Res, Delete, Param, Inject } from '@nestjs/common';
import { FlowAppointmentService } from './flow-appointment.service';
import { FlowTriggerService } from '../flow-message/flow-trigger.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('flow-appointments')
export class FlowAppointmentController {
  constructor(
    private readonly flowAppointmentService: FlowAppointmentService,
    private readonly flowTriggerService: FlowTriggerService,
  ) {}

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
        const departments = await this.flowAppointmentService.getDepartments();
        const locations = await this.flowAppointmentService.getLocations();
        const timeSlots = await this.flowAppointmentService.getTimeSlots();
        
        console.log('Providing initial data:', { departments, locations, timeSlots });
        
        return res.status(200).json({
          screen: 'APPOINTMENT',
          data: {
            departments,
            locations,
            time_slots: timeSlots
          }
        });
      } catch (error) {
        console.error('Error getting initial data:', error);
        return res.status(200).json({
          screen: 'APPOINTMENT',
          data: {
            departments: [],
            locations: [],
            time_slots: []
          }
        });
      }
    }
    
    if (action === 'data_exchange' && screen === 'SUMMARY') {
      try {
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
