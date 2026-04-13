import { Injectable } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';
import axios from 'axios';

@Injectable()
export class LandingContactService {
  constructor(private prisma: CentralPrismaService) {}

  async submitForm(data: any) {
    console.log('📝 Submitting landing contact form:', data);
    
    const submission = await this.prisma.landingContactSubmission.create({
      data: {
        businessName: data.businessName,
        yourName: data.yourName,
        whatsappNumber: data.whatsappNumber,
        hasWebsite: data.hasWebsite,
        primaryGoal: data.primaryGoal,
      },
    });

    console.log('✅ Submission created with ID:', submission.id);

    let whatsappMessageSent = false;
    let whatsappMessageId = null;

    try {
      console.log('📱 Attempting to send WhatsApp message to:', data.whatsappNumber);
      const result = await this.sendWhatsAppMessage(
        data.whatsappNumber,
        data.yourName,
      );
      console.log('📱 WhatsApp send result:', result);
      
      whatsappMessageSent = result.success;
      whatsappMessageId = result.messageId;

      await this.prisma.landingContactSubmission.update({
        where: { id: submission.id },
        data: {
          whatsappMessageSent,
          whatsappMessageId,
        },
      });
      
      console.log('✅ Submission updated with WhatsApp status:', { whatsappMessageSent, whatsappMessageId });
    } catch (error) {
      console.error('❌ Failed to send WhatsApp message:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
    }

    return {
      submissionId: submission.id,
      whatsappMessageSent,
    };
  }

  private async sendWhatsAppMessage(phoneNumber: string, customerName: string) {
    const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    console.log('🔧 WhatsApp Configuration:', {
      apiUrl: WHATSAPP_API_URL,
      phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
      hasToken: !!WHATSAPP_TOKEN,
      tokenLength: WHATSAPP_TOKEN?.length,
      targetPhone: phoneNumber,
      customerName: customerName
    });

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.error('❌ WhatsApp credentials not configured');
      throw new Error('WhatsApp credentials not configured');
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'onboarding_welcome_message',
        language: {
          code: 'en',
        },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: {
                  link: 'https://whatsapp.api.luisant.cloud/uploads/header-1776079065789-806612507.png'
                }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: customerName,
              },
            ],
          },
        ],
      },
    };

    console.log('📤 Sending WhatsApp API request:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(
        `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('✅ WhatsApp API Response:', response.data);

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      console.error('❌ WhatsApp API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }
}
