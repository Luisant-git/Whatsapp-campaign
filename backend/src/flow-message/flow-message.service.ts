import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

export interface FlowMessageParams {
  to: string;
  flowId?: string;
  flowName?: string;
  flowCta: string;
  header?: string;
  body?: string;
  footer?: string;
  flowToken?: string;
  flowAction?: 'navigate' | 'data_exchange';
  flowActionPayload?: {
    screen?: string;
    data?: Record<string, any>;
  };
  mode?: 'draft' | 'published';
}

export interface FlowTemplateParams {
  templateName: string;
  to: string;
  languageCode: string;
  flowToken?: string;
  flowActionData?: Record<string, any>;
}

@Injectable()
export class FlowMessageService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {}

  /**
   * Send an interactive Flow message
   */
  async sendFlowMessage(params: FlowMessageParams, phoneNumberId: string): Promise<any> {
    try {
      const settings = await this.getWhatsAppSettings(phoneNumberId);
      if (!settings) {
        throw new Error('WhatsApp settings not found');
      }

      const flowToken = params.flowToken || this.generateFlowToken();
      
      const messageData = {
        recipient_type: 'individual',
        messaging_product: 'whatsapp',
        to: params.to,
        type: 'interactive',
        interactive: {
          type: 'flow',
          header: params.header ? {
            type: 'text',
            text: params.header
          } : undefined,
          body: {
            text: params.body || 'Please complete the flow below'
          },
          footer: params.footer ? {
            text: params.footer
          } : undefined,
          action: {
            name: 'flow',
            parameters: {
              flow_message_version: '3',
              flow_token: flowToken,
              flow_cta: params.flowCta,
              mode: params.mode || 'published',
              ...(params.flowId && { flow_id: params.flowId }),
              ...(params.flowName && { flow_name: params.flowName }),
              ...(params.flowAction && { flow_action: params.flowAction }),
              ...(params.flowActionPayload && { flow_action_payload: params.flowActionPayload })
            }
          }
        }
      };

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${settings.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Flow message sent successfully:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Failed to send flow message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a Flow template message
   */
  async sendFlowTemplate(params: FlowTemplateParams, phoneNumberId: string): Promise<any> {
    try {
      const settings = await this.getWhatsAppSettings(phoneNumberId);
      if (!settings) {
        throw new Error('WhatsApp settings not found');
      }

      const flowToken = params.flowToken || this.generateFlowToken();

      const messageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: 'template',
        template: {
          name: params.templateName,
          language: {
            code: params.languageCode
          },
          components: [
            {
              type: 'button',
              sub_type: 'flow',
              index: '0',
              parameters: [
                {
                  type: 'action',
                  action: {
                    flow_token: flowToken,
                    ...(params.flowActionData && { flow_action_data: params.flowActionData })
                  }
                }
              ]
            }
          ]
        }
      };

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${settings.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Flow template sent successfully:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Failed to send flow template:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create a message template with Flow
   */
  async createFlowTemplate(
    wabaId: string,
    templateName: string,
    category: 'MARKETING' | 'UTILITY',
    language: string,
    bodyText: string,
    buttonText: string,
    flowId?: string,
    flowName?: string,
    flowJson?: string,
    accessToken?: string
  ): Promise<any> {
    try {
      if (!flowId && !flowName && !flowJson) {
        throw new Error('Either flowId, flowName, or flowJson must be provided');
      }

      const templateData = {
        name: templateName,
        language: language,
        category: category,
        components: [
          {
            type: 'BODY',
            text: bodyText
          },
          {
            type: 'BUTTONS',
            buttons: [
              {
                type: 'FLOW',
                text: buttonText,
                ...(flowId && { flow_id: flowId }),
                ...(flowName && { flow_name: flowName }),
                ...(flowJson && { flow_json: flowJson }),
                flow_action: 'navigate'
              }
            ]
          }
        ]
      };

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${wabaId}/message_templates`,
        templateData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Flow template created successfully:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Failed to create flow template:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send appointment booking flow
   */
  async sendAppointmentFlow(to: string, phoneNumberId: string): Promise<any> {
    return this.sendFlowMessage({
      to,
      flowName: 'appointment_booking_v1', // Your flow name in Meta Business Manager
      flowCta: 'Book Appointment',
      header: '📅 Book Your Appointment',
      body: 'Click the button below to book your appointment with us.',
      footer: 'Powered by WhatsApp Flows',
      flowAction: 'data_exchange' // Use data_exchange to call your endpoint
    }, phoneNumberId);
  }

  /**
   * Generate a secure flow token
   */
  private generateFlowToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get WhatsApp settings for phone number
   */
  private async getWhatsAppSettings(phoneNumberId: string): Promise<any> {
    const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
    
    for (const tenant of tenants) {
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
      
      const settings = await (tenantClient as any).whatsAppSettings.findFirst({
        where: { phoneNumberId }
      });
      
      if (settings) {
        return settings;
      }
    }
    
    return null;
  }
}