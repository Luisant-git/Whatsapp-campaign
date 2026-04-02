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
    console.log('🔍 Getting appointments for user ID:', userId);
    console.log('📋 Session details:', {
      userId: req.session.userId,
      user: req.session.user,
      sessionId: req.sessionID
    });
    
    const appointments = await this.flowAppointmentService.getAppointments(userId);
    console.log('📊 Found appointments:', appointments?.length || 0);
    
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

  @Post(':id/finish')
  async finishAppointment(@Param('id') id: string, @Body() body: { remarks?: string }, @Req() req: any) {
    try {
      const appointmentId = parseInt(id);
      
      // Find which tenant owns this appointment
      const tenants = await this.flowAppointmentService['centralPrisma'].tenant.findMany({ 
        where: { isActive: true } 
      });
      
      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.flowAppointmentService['tenantPrisma'].getTenantClient(tenant.id.toString(), dbUrl);
        
        const appointment = await (tenantClient as any).flowAppointment.findUnique({
          where: { id: appointmentId }
        });
        
        if (appointment) {
          await this.flowAppointmentService.markAppointmentFinished(
            appointmentId,
            body.remarks || '',
            tenant.id
          );
          return {
            success: true,
            message: 'Appointment marked as finished'
          };
        }
      }
      
      return {
        success: false,
        message: 'Appointment not found'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update appointment status'
      };
    }
  }

  @Post(':id/status')
  @UseGuards(SessionGuard)
  async updateAppointmentStatus(
    @Param('id') id: string, 
    @Body() body: { status: string; remarks?: string }, 
    @Req() req: any
  ) {
    const userId = req.session.userId || req.session.user?.id;
    try {
      await this.flowAppointmentService.updateAppointmentStatus(
        parseInt(id), 
        body.status, 
        body.remarks || '', 
        userId
      );
      return {
        success: true,
        message: 'Appointment status updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update appointment status'
      };
    }
  }

  @Delete('cleanup/empty')
  @UseGuards(SessionGuard)
  async cleanupEmptyAppointments(@Req() req: any) {
    const userId = req.session.userId || req.session.user?.id;
    try {
      const deletedCount = await this.flowAppointmentService.cleanupEmptyAppointments(userId);
      return {
        success: true,
        message: `Cleaned up ${deletedCount} empty appointment records`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to cleanup empty appointments'
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
        console.log('🔍 Flow token:', flow_token);
        
        // Extract phone number from data
        const phoneNumber = data.phone || data.phone_number;
        
        await this.flowAppointmentService.saveAppointmentFromFlow(data, flow_token, phoneNumber);
        
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
