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
            const assetsResponse = await axios.get(
              `https://graph.facebook.com/${this.apiVersion}/${flow.id}/assets`,
              {
                headers: {
                  'Authorization': `Bearer ${this.accessToken}`,
                }
              }
            );
            
            let firstScreen = 'SCREEN';
            const asset = assetsResponse.data?.data?.find((a: any) => a.asset_type === 'FLOW_JSON');
            if (asset?.download_url) {
              try {
                const jsonResponse = await axios.get(asset.download_url);
                firstScreen = jsonResponse.data?.screens?.[0]?.id || 'SCREEN';
              } catch (_) {}
            }
            
            return {
              id: flow.id,
              name: flow.name,
              description: flow.status,
              status: flow.status,
              updatedAt: flow.updated_time,
              firstScreen,
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
          headerText: data.headerText || 'WhatsApp Business Services',
          bodyText: data.bodyText || 'Click the button below to schedule a demo!',
          footerText: data.footerText || 'Powered by Luisant',
          ctaText: data.ctaText || 'Schedule Demo',
          screenName: data.screenName || 'SERVICE_SELECTION',
          screenData: data.screenData || {},
          purpose: 'appointment', // Add purpose for proper flow token generation
          tenantId: '1' // Default tenant ID, should be dynamic in production
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
      flow_token: `${params.purpose || 'flow'}_${Date.now()}_${params.tenantId || '1'}_${Math.random().toString(36).substr(2, 9)}`,
      flow_id: params.flowId,
      flow_cta: params.ctaText,
      flow_action: 'data_exchange', // ✅ Changed from 'navigate' to 'data_exchange' to call endpoint
    };

    // Only add flow_action_payload if you want to pass initial data
    // For most cases, let the endpoint provide the data
    if (params.screenData && Object.keys(params.screenData).length > 0) {
      actionParams.flow_action_payload = {
        screen: params.screenName || 'APPOINTMENT',
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

  async sendFlowManually(userId: number, data: any) {
    try {
      const response = await this.sendSingleFlowMessage({
        phoneNumber: data.phoneNumber,
        flowId: data.flowId,
        headerText: data.headerText || '',
        bodyText: data.bodyText || 'Click the button below to continue',
        footerText: data.footerText || '',
        ctaText: data.ctaText || 'Start Flow',
        screenName: 'SERVICE_SELECTION', // Updated to SERVICE_SELECTION for WhatsApp Business Services flow
        screenData: {},
        purpose: 'manual', // Manual flow trigger
        tenantId: userId.toString()
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        phoneNumber: data.phoneNumber
      };
    } catch (error: any) {
      console.error('Error sending manual flow:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to send flow');
    }
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