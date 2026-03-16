import { Injectable } from '@nestjs/common';
import { FlowAppointmentService } from '../flow-appointment/flow-appointment.service';

export interface FlowResponseWebhook {
  messages: Array<{
    context?: {
      from: string;
      id: string;
    };
    from: string;
    id: string;
    type: string;
    interactive?: {
      type: string;
      nfm_reply?: {
        name: string;
        body: string;
        response_json: string;
      };
    };
    timestamp: string;
  }>;
}

@Injectable()
export class FlowWebhookService {
  constructor(
    private flowAppointmentService: FlowAppointmentService
  ) {}

  /**
   * Process incoming Flow response webhook
   */
  async processFlowResponse(webhook: FlowResponseWebhook, phoneNumberId: string): Promise<void> {
    try {
      for (const message of webhook.messages) {
        if (message.type === 'interactive' && message.interactive?.type === 'nfm_reply') {
          const nfmReply = message.interactive.nfm_reply;
          
          if (nfmReply?.name === 'flow' && nfmReply.response_json) {
            console.log('📥 Received Flow response');
            console.log('From:', message.from);
            console.log('Message ID:', message.id);
            console.log('Response JSON:', nfmReply.response_json);
            
            // Parse the response JSON
            const responseData = JSON.parse(nfmReply.response_json);
            
            // Extract flow token and other data
            const flowToken = responseData.flow_token;
            console.log('Flow Token:', flowToken);
            
            // Handle different types of flows based on flow_token or response data
            await this.handleFlowCompletion(responseData, message.from, phoneNumberId);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing Flow response:', error);
      throw error;
    }
  }

  /**
   * Handle Flow completion based on response data
   */
  private async handleFlowCompletion(
    responseData: any,
    phoneNumber: string,
    phoneNumberId: string
  ): Promise<void> {
    try {
      // Check if this is an appointment booking flow
      if (this.isAppointmentFlow(responseData)) {
        console.log('📅 Processing appointment booking...');
        
        await this.flowAppointmentService.saveAppointmentFromWebhook(
          responseData,
          phoneNumber,
          phoneNumberId
        );
        
        console.log('✅ Appointment saved successfully');
      } else {
        console.log('ℹ️ Unknown flow type, logging response data');
        console.log('Response data:', JSON.stringify(responseData, null, 2));
      }
    } catch (error) {
      console.error('❌ Error handling flow completion:', error);
      throw error;
    }
  }

  /**
   * Check if the response is from an appointment booking flow
   */
  private isAppointmentFlow(responseData: any): boolean {
    return !!(
      responseData.department ||
      responseData.location ||
      responseData.date ||
      responseData.time ||
      responseData.name
    );
  }

  /**
   * Extract and validate flow token
   */
  extractFlowToken(responseData: any): string | null {
    return responseData.flow_token || null;
  }

  /**
   * Parse Flow response JSON safely
   */
  parseFlowResponse(responseJson: string): any {
    try {
      return JSON.parse(responseJson);
    } catch (error) {
      console.error('Failed to parse Flow response JSON:', error);
      return null;
    }
  }
}