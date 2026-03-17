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
      await this.flowAppointmentService.saveAppointment(data, 1);
      
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