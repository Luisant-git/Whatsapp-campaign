import { Controller, Post, Get, Body, HttpCode, Headers } from '@nestjs/common';
import { FlowAppointmentService } from '../flow-appointment/flow-appointment.service';

@Controller('meta')
export class FlowDataController {
  constructor(private flowAppointmentService: FlowAppointmentService) {}

  @Post('flows')
  @HttpCode(200)
  async getFlowData(@Body() body: any, @Headers() headers: any) {
    console.log('🔥 FLOW DATA REQUEST RECEIVED!');
    console.log('=== FLOW DATA REQUEST ===');
    console.log('Screen:', body?.screen || 'undefined');
    console.log('Flow Token:', body?.flow_token || 'undefined');
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('========================');

    try {
      const { screen, data, flow_token } = body || {};

      // Simple test response for APPOINTMENT screen
      if (screen === 'APPOINTMENT') {
        console.log('📅 Returning test appointment data...');
        return {
          data: {
            department: [
              { id: '1', title: 'Sales' },
              { id: '2', title: 'Support' },
              { id: '3', title: 'Technical' }
            ],
            location: [
              { id: '1', title: 'New York' },
              { id: '2', title: 'London' }
            ],
            date: [
              { id: '2026-03-16', title: 'Sun Mar 16 2026' },
              { id: '2026-03-17', title: 'Mon Mar 17 2026' }
            ],
            time: [
              { id: '10:30', title: '10:30 AM' },
              { id: '11:30', title: '11:30 AM' },
              { id: '14:30', title: '2:30 PM' }
            ]
          }
        };
      }

      // Default response
      return {
        data: {
          message: 'Flow data endpoint is working',
          screen: screen || 'unknown',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Flow data error:', error.message);
      return {
        data: {
          error: 'Failed to process request',
          message: error.message
        }
      };
    }
  }

  @Get('flows')
  async testEndpoint() {
    return {
      status: 'active',
      message: 'Flow data endpoint is working',
      timestamp: new Date().toISOString()
    };
  }

  private async getAppointmentData() {
    console.log('📅 Loading appointment data from database...');
    
    // Get dynamic data from database
    const departments = await this.flowAppointmentService.getDepartments();
    const locations = await this.flowAppointmentService.getLocations();
    const timeSlots = await this.flowAppointmentService.getTimeSlots();
    const dates = this.generateDates(7);

    const response = {
      data: {
        department: departments,
        location: locations,
        date: dates,
        time: timeSlots
      }
    };

    console.log(`📅 Loaded: departments:${departments.length} locations:${locations.length} dates:${dates.length} times:${timeSlots.length}`);
    return response;
  }

  private handleAppointmentDetails(data: any) {
    console.log('📝 Processing appointment details...');
    
    // Navigate to summary screen with form data
    return {
      screen: 'SUMMARY',
      data: {
        summary: `${data.department} at ${data.location} on ${data.date} at ${data.time}\\n\\nName: ${data.name}\\nEmail: ${data.email}\\nPhone: ${data.phone}`,
        ...data
      }
    };
  }

  private async saveAppointment(data: any, flowToken: string) {
    console.log('💾 Saving appointment...', { flowToken });
    
    try {
      // Save to database
      await this.flowAppointmentService.saveAppointment(data, 1);
      
      console.log('✅ Appointment saved successfully');
      
      return {
        screen: 'SUCCESS',
        data: {
          message: 'Appointment booked successfully!'
        }
      };
    } catch (error) {
      console.error('❌ Failed to save appointment:', error.message);
      
      return {
        screen: 'SUMMARY',
        data: {
          ...data,
          error: 'Failed to save appointment. Please try again.'
        }
      };
    }
  }

  private generateDates(days: number): Array<{id: string, title: string}> {
    const dates: Array<{id: string, title: string}> = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const dateTitle = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
      });
      
      dates.push({
        id: dateStr,
        title: dateTitle
      });
    }
    
    return dates;
  }
}