import { Controller, Post, Body, HttpCode, Headers } from '@nestjs/common';
import { FlowAppointmentService } from '../flow-appointment/flow-appointment.service';

@Controller('meta')
export class FlowDataController {
  constructor(private flowAppointmentService: FlowAppointmentService) {}

  @Post('flows')
  @HttpCode(200)
  async getFlowData(@Body() body: any, @Headers() headers: any) {
    console.log('=== FLOW DATA REQUEST ===');
    console.log('Screen:', body.screen);
    console.log('Flow Token:', body.flow_token);
    console.log('Data:', JSON.stringify(body.data, null, 2));
    console.log('========================');

    const { screen, data, flow_token } = body;

    try {
      switch (screen) {
        case 'APPOINTMENT':
          return await this.getAppointmentData();

        case 'DETAILS':
          // Handle form submission and navigate to summary
          return this.handleAppointmentDetails(data);

        case 'SUMMARY':
          // Save appointment and show success
          return await this.saveAppointment(data, flow_token);

        default:
          console.log(`Unknown screen: ${screen}`);
          return { data: {} };
      }
    } catch (error) {
      console.error('Flow data error:', error.message);
      return {
        data: {
          error: 'Failed to load data'
        }
      };
    }
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