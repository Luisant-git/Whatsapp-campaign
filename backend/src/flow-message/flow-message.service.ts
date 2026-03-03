import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { FlowResult, SendFlowDto, FlowResponse } from './flow-message.types';

@Injectable()
export class FlowMessageService {
  private readonly accessToken = process.env.META_ACCESS_TOKEN || 'EAAcMSpblosgBQ0Lr9x2byXAquXp5o1ceNowmZCJBDdHMtENNjHiZA8HkMALo6tP5ctnWyJWDIBZAENZAvQluvtGAdjouaEGIPYZBglCh1NZBFpWLUMTCZC79uWG468iYgh1nSYE1Fz4NO72sA6NeMjxG6CgD8JqcsGOH7kVjxfrdZACwOyRJl5AhxqlZBZAHPwuDPgBQZDZD';
  private readonly phoneNumberId = process.env.META_PHONE_NUMBER_ID || '803957376127788';

  getAvailableFlows() {
    return [
      {
        id: '945035507959464',
        name: 'Flow Sample',
        description: 'Sample appointment booking flow',
        firstScreen: 'APPOINTMENT'
      }
    ];
  }

  async sendFlowToNumbers(data: SendFlowDto): Promise<FlowResponse> {
    const results: FlowResult[] = [];
    
    for (const phoneNumber of data.phoneNumbers) {
      try {
        const response = await this.sendSingleFlowMessage({
          phoneNumber,
          flowId: data.flowId,
          headerText: data.headerText || 'Flow Message',
          bodyText: data.bodyText || 'Click the button below to start the Flow experience!',
          footerText: data.footerText || 'Powered by Meta Flow',
          ctaText: data.ctaText || 'Start Flow',
          screenName: data.screenName || 'APPOINTMENT',
          screenData: data.screenData || {}
        });

        results.push({
          phoneNumber,
          status: 'success',
          messageId: response.data.messages[0].id
        });
      } catch (error: any) {
        results.push({
          phoneNumber,
          status: 'failed',
          error: error.response?.data?.error?.message || error.message
        });
      }
    }

    return {
      totalSent: results.filter(r => r.status === 'success').length,
      totalFailed: results.filter(r => r.status === 'failed').length,
      results
    };
  }

  private async sendSingleFlowMessage(params: any) {
    return axios.post(
      `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'flow',
          header: {
            type: 'text',
            text: params.headerText
          },
          body: {
            text: params.bodyText
          },
          footer: {
            text: params.footerText
          },
          action: {
            name: 'flow',
            parameters: {
              flow_message_version: '3',
              flow_token: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              flow_id: params.flowId,
              flow_cta: params.ctaText,
              flow_action: 'navigate',
              flow_action_payload: {
                screen: params.screenName,
                data: params.screenData
              }
            }
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  getSentHistory() {
    // This would typically fetch from database
    return {
      totalSent: 0,
      recentMessages: []
    };
  }
}