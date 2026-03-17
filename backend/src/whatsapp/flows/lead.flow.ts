import { Injectable } from '@nestjs/common';
import { FlowHandler } from './flow-handler.interface';

@Injectable()
export class LeadFlowHandler implements FlowHandler {
  purpose = 'lead';

  async getInitialData(data?: any): Promise<any> {
    return {
      interests: [
        { id: 'product_demo', title: 'Product Demo' },
        { id: 'pricing', title: 'Pricing Information' },
        { id: 'consultation', title: 'Free Consultation' },
        { id: 'trial', title: 'Free Trial' }
      ],
      company_sizes: [
        { id: '1-10', title: '1-10 employees' },
        { id: '11-50', title: '11-50 employees' },
        { id: '51-200', title: '51-200 employees' },
        { id: '200+', title: '200+ employees' }
      ],
      budgets: [
        { id: 'under_1k', title: 'Under $1,000' },
        { id: '1k_5k', title: '$1,000 - $5,000' },
        { id: '5k_10k', title: '$5,000 - $10,000' },
        { id: 'over_10k', title: 'Over $10,000' }
      ]
    };
  }

  async handleDataExchange(screen: string, data: any, session: any): Promise<any> {
    switch (screen) {
      case 'LEAD_CAPTURE':
        return {
          screen: 'LEAD_CAPTURE',
          data: await this.getInitialData()
        };

      case 'DETAILS':
        return {
          screen: 'SUMMARY',
          data: {
            summary: `Interest: ${data.interest}\\nCompany: ${data.company}\\nSize: ${data.company_size}\\nBudget: ${data.budget}\\n\\nName: ${data.name}\\nEmail: ${data.email}\\nPhone: ${data.phone}`,
            ...data
          }
        };

      case 'SUMMARY':
        return this.processSubmission(data, session);

      default:
        return { 
          screen: 'LEAD_CAPTURE',
          data: {} 
        };
    }
  }

  async processSubmission(data: any, session: any): Promise<any> {
    try {
      // Save lead to database
      console.log('Saving lead:', data);
      
      return {
        screen: 'SUCCESS',
        data: {
          extension_message_response: {
            params: {
              flow_token: session.flowToken || 'completed',
              message: 'Thank you! Our team will contact you soon.'
            }
          }
        }
      };
    } catch (error) {
      return {
        screen: 'SUMMARY',
        data: {
          error_message: 'Failed to save lead information'
        }
      };
    }
  }
}