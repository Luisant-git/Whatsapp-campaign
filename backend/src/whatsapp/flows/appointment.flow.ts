import { Injectable } from '@nestjs/common';
import { FlowHandler } from './flow-handler.interface';
import { FlowAppointmentService } from '../../flow-appointment/flow-appointment.service';

@Injectable()
export class AppointmentFlowHandler implements FlowHandler {
  purpose = 'appointment';

  constructor(private flowAppointmentService: FlowAppointmentService) {}

  async getInitialData(data?: any): Promise<any> {
    const departments = await this.flowAppointmentService.getDepartments();
    const locations = await this.flowAppointmentService.getLocations();
    const timeSlots = await this.flowAppointmentService.getTimeSlots();
    const dates = this.generateDates(7);
    
    return {
      department: departments,
      location: locations,
      date: dates,
      time: timeSlots
    };
  }

  async handleDataExchange(screen: string, data: any, session: any): Promise<any> {
    switch (screen) {
      case 'APPOINTMENT':
        return {
          screen: 'APPOINTMENT',
          data: await this.getInitialData()
        };

      case 'DETAILS':
        const deptTitle = await this.flowAppointmentService.getDepartmentTitle(data.department);
        const locTitle = await this.flowAppointmentService.getLocationTitle(data.location);
        
        return {
          screen: 'SUMMARY',
          data: {
            summary: `${deptTitle} at ${locTitle} on ${data.date} at ${data.time}\\n\\nName: ${data.name}\\nEmail: ${data.email}\\nPhone: ${data.phone}`,
            department: data.department,
            location: data.location,
            date: data.date,
            time: data.time,
            name: data.name,
            email: data.email,
            phone: data.phone
          }
        };

      case 'SUMMARY':
        return this.processSubmission(data, session);

      default:
        return { 
          screen: 'APPOINTMENT',
          data: {} 
        };
    }
  }

  async processSubmission(data: any, session: any): Promise<any> {
    try {
      console.log('💾 Processing appointment submission via flow handler');
      console.log('📋 Data:', JSON.stringify(data, null, 2));
      console.log('🔑 Session:', JSON.stringify(session, null, 2));
      
      // Use the new saveAppointmentFromFlow method that saves to all tenants
      await this.flowAppointmentService.saveAppointmentFromFlow(data, session.flowToken);
      
      return {
        screen: 'SUCCESS',
        data: {
          extension_message_response: {
            params: {
              flow_token: session.flowToken || 'completed'
            }
          }
        }
      };
    } catch (error) {
      console.error('❌ Error in flow handler submission:', error);
      return {
        screen: 'SUMMARY',
        data: {
          error_message: 'Failed to save appointment'
        }
      };
    }
  }

  private generateDates(days: number): Array<{id: string, title: string}> {
    const dates: Array<{id: string, title: string}> = [];
    
    // Use IST timezone (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    const currentHour = istTime.getUTCHours();
    const currentMinute = istTime.getUTCMinutes();
    const lastDemoHour = 17; // Last demo time slot is 5:30 PM (17:30)
    const lastDemoMinute = 30;
    
    console.log(`⏰ Current IST time: ${currentHour}:${currentMinute}, Last demo slot: ${lastDemoHour}:${lastDemoMinute}`);
    
    // If current time is past last demo slot (5:30 PM), start from tomorrow
    const isPastLastSlot = currentHour > lastDemoHour || (currentHour === lastDemoHour && currentMinute >= lastDemoMinute);
    const startDay = isPastLastSlot ? 1 : 0;
    
    console.log(`📅 Starting from day ${startDay} (0=today, 1=tomorrow)`);
    
    for (let i = startDay; i < days + startDay; i++) {
      const date = new Date(istTime);
      date.setDate(istTime.getUTCDate() + i);
      
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
    
    console.log(`📅 Generated ${dates.length} dates starting from ${dates[0]?.title}`);
    return dates;
  }
}