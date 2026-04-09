import { Injectable } from '@nestjs/common';
import { FlowAppointmentService } from '../flow-appointment/flow-appointment.service';

@Injectable()
export class FlowDataService {
  constructor(private flowAppointmentService: FlowAppointmentService) {}

  async getScreenData(screenName: string, data?: any): Promise<any> {
    switch (screenName) {
      case 'APPOINTMENT':
        return this.getAppointmentData();
      
      case 'CONTACT_FORM':
        return this.getContactFormData();
      
      case 'SURVEY':
        return this.getSurveyData();
      
      case 'PRODUCT_CATALOG':
        return this.getProductCatalogData();
      
      case 'FEEDBACK':
        return this.getFeedbackData();
      
      default:
        return { message: `No data handler for screen: ${screenName}` };
    }
  }

  private async getAppointmentData() {
    const departments = await this.flowAppointmentService.getDepartments();
    const locations = await this.flowAppointmentService.getLocations();
    const timeSlots = await this.flowAppointmentService.getTimeSlots();
    const dates = this.generateDates(7);
    
    return {
      department: departments,
      location: locations,
      is_location_enabled: true,
      date: dates,
      is_date_enabled: true,
      time: timeSlots,
      is_time_enabled: true
    };
  }

  private getContactFormData() {
    return {
      departments: [
        { id: 'sales', title: 'Sales' },
        { id: 'support', title: 'Support' },
        { id: 'billing', title: 'Billing' },
        { id: 'technical', title: 'Technical Support' }
      ],
      priority_levels: [
        { id: 'low', title: 'Low' },
        { id: 'medium', title: 'Medium' },
        { id: 'high', title: 'High' },
        { id: 'urgent', title: 'Urgent' }
      ]
    };
  }

  private getSurveyData() {
    return {
      rating_options: [
        { id: '1', title: '1 - Very Poor' },
        { id: '2', title: '2 - Poor' },
        { id: '3', title: '3 - Average' },
        { id: '4', title: '4 - Good' },
        { id: '5', title: '5 - Excellent' }
      ],
      categories: [
        { id: 'product', title: 'Product Quality' },
        { id: 'service', title: 'Customer Service' },
        { id: 'delivery', title: 'Delivery Experience' }
      ]
    };
  }

  private getProductCatalogData() {
    return {
      categories: [
        { id: 'electronics', title: 'Electronics' },
        { id: 'clothing', title: 'Clothing' },
        { id: 'home', title: 'Home & Garden' },
        { id: 'books', title: 'Books' }
      ],
      price_ranges: [
        { id: '0-50', title: '$0 - $50' },
        { id: '50-100', title: '$50 - $100' },
        { id: '100-500', title: '$100 - $500' },
        { id: '500+', title: '$500+' }
      ]
    };
  }

  private getFeedbackData() {
    return {
      feedback_types: [
        { id: 'compliment', title: 'Compliment' },
        { id: 'complaint', title: 'Complaint' },
        { id: 'suggestion', title: 'Suggestion' },
        { id: 'question', title: 'Question' }
      ]
    };
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
    
    // If current time is past last demo slot (5:30 PM), start from tomorrow
    const isPastLastSlot = currentHour > lastDemoHour || (currentHour === lastDemoHour && currentMinute >= lastDemoMinute);
    const startDay = isPastLastSlot ? 1 : 0;
    
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
    
    return dates;
  }
}