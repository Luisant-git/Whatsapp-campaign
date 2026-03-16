import { Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { FlowResult, SendFlowDto, FlowResponse } from './flow-message.types';

@Injectable()
export class FlowMessageService {
  private readonly accessToken = process.env.META_ACCESS_TOKEN || 'EAAcMSpblosgBQ0Lr9x2byXAquXp5o1ceNowmZCJBDdHMtENNjHiZA8HkMALo6tP5ctnWyJWDIBZAENZAvQluvtGAdjouaEGIPYZBglCh1NZBFpWLUMTCZC79uWG468iYgh1nSYE1Fz4NO72sA6NeMjxG6CgD8JqcsGOH7kVjxfrdZACwOyRJl5AhxqlZBZAHPwuDPgBQZDZD';
  private readonly phoneNumberId = process.env.META_PHONE_NUMBER_ID || '803957376127788';
  private readonly wabaId = process.env.META_WABA_ID || '24366060823054981';
  private readonly apiVersion = 'v21.0';

  async getAvailableFlows() {
    try {
      if (!this.wabaId) {
        console.error('META_WABA_ID not configured');
        return [];
      }

      const response = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${this.wabaId}/flows`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          }
        }
      );
      
      // Fetch details for each flow to get first screen
      const flowsWithDetails = await Promise.all(
        response.data.data.map(async (flow: any) => {
          try {
            const detailResponse = await axios.get(
              `https://graph.facebook.com/${this.apiVersion}/${flow.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${this.accessToken}`,
                }
              }
            );
            
            return {
              id: flow.id,
              name: flow.name,
              description: flow.status,
              status: flow.status,
              updatedAt: flow.updated_time,
              firstScreen: detailResponse.data.json_version?.screens?.[0]?.id || 'SCREEN'
            };
          } catch (error) {
            return {
              id: flow.id,
              name: flow.name,
              description: flow.status,
              status: flow.status,
              updatedAt: flow.updated_time,
              firstScreen: 'SCREEN'
            };
          }
        })
      );
      
      return flowsWithDetails;
    } catch (error) {
      console.error('Error fetching flows from Meta:', error.response?.data || error.message);
      return [];
    }
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
          screenName: data.screenName || 'SCREEN',
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
    const actionParams: any = {
      flow_message_version: '3',
      flow_token: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      flow_id: params.flowId,
      flow_cta: params.ctaText,
      flow_action: 'navigate',
    };

    if (params.screenName && params.screenName !== 'SCREEN') {
      actionParams.flow_action_payload = {
        screen: params.screenName,
        data: params.screenData
      };
    }

    const interactive: any = {
      type: 'flow',
      body: {
        text: params.bodyText
      },
      action: {
        name: 'flow',
        parameters: actionParams
      }
    };

    if (params.headerText) {
      interactive.header = {
        type: 'text',
        text: params.headerText
      };
    }

    if (params.footerText) {
      interactive.footer = {
        text: params.footerText
      };
    }

    return axios.post(
      `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.phoneNumber,
        type: 'interactive',
        interactive
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

  async createFlow(flowData: any) {
    try {
      console.log('Creating flow with data:', JSON.stringify(flowData.flowJson, null, 2));

      // Step 1: Create flow
      const response = await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${this.wabaId}/flows`,
        {
          name: flowData.name,
          categories: ['APPOINTMENT_BOOKING']
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const flowId = response.data.id;
      console.log('Flow created:', flowId);

      // Step 2: Upload flow JSON
      const formData = new FormData();
      formData.append('file', JSON.stringify(flowData.flowJson), {
        filename: 'flow.json',
        contentType: 'application/json'
      });
      formData.append('name', 'flow.json');
      formData.append('asset_type', 'FLOW_JSON');

      const uploadResponse = await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${flowId}/assets`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            ...formData.getHeaders()
          }
        }
      );
      console.log('Flow JSON uploaded:', uploadResponse.data);

      // Step 3: Publish the flow
      const publishResponse = await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${flowId}/publish`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Flow published:', publishResponse.data);

      return { success: true, flowId, status: 'published' };
    } catch (error) {
      console.error('Error creating flow:', error.response?.data || error.message);
      throw error;
    }
  }
}