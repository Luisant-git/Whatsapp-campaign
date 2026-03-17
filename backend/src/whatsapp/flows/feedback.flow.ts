import { Injectable } from '@nestjs/common';
import { FlowHandler } from './flow-handler.interface';

@Injectable()
export class FeedbackFlowHandler implements FlowHandler {
  purpose = 'feedback';

  async getInitialData(data?: any): Promise<any> {
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
        { id: 'delivery', title: 'Delivery Experience' },
        { id: 'overall', title: 'Overall Experience' }
      ]
    };
  }

  async handleDataExchange(screen: string, data: any, session: any): Promise<any> {
    switch (screen) {
      case 'FEEDBACK':
        return {
          screen: 'FEEDBACK',
          data: await this.getInitialData()
        };

      case 'DETAILS':
        return {
          screen: 'SUMMARY',
          data: {
            summary: `Rating: ${data.rating}/5\\nCategory: ${data.category}\\nComments: ${data.comments}\\n\\nName: ${data.name}\\nEmail: ${data.email}`,
            ...data
          }
        };

      case 'SUMMARY':
        return this.processSubmission(data, session);

      default:
        return { 
          screen: 'FEEDBACK',
          data: {} 
        };
    }
  }

  async processSubmission(data: any, session: any): Promise<any> {
    try {
      // Save feedback to database
      console.log('Saving feedback:', data);
      
      return {
        screen: 'SUCCESS',
        data: {
          extension_message_response: {
            params: {
              flow_token: session.flowToken || 'completed',
              message: 'Thank you for your feedback!'
            }
          }
        }
      };
    } catch (error) {
      return {
        screen: 'SUMMARY',
        data: {
          error_message: 'Failed to save feedback'
        }
      };
    }
  }
}