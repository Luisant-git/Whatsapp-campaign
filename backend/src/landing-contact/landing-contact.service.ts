import { Injectable } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';
import axios from 'axios';

@Injectable()
export class LandingContactService {
  constructor(private prisma: CentralPrismaService) {}

  async submitForm(data: any) {
    const submission = await this.prisma.landingContactSubmission.create({
      data: {
        businessName: data.businessName,
        yourName: data.yourName,
        whatsappNumber: data.whatsappNumber,
        hasWebsite: data.hasWebsite,
        primaryGoal: data.primaryGoal,
      },
    });

    let whatsappMessageSent = false;
    let whatsappMessageId = null;

    try {
      const result = await this.sendWhatsAppMessage(
        data.whatsappNumber,
        data.yourName,
      );
      whatsappMessageSent = result.success;
      whatsappMessageId = result.messageId;

      await this.prisma.landingContactSubmission.update({
        where: { id: submission.id },
        data: {
          whatsappMessageSent,
          whatsappMessageId,
        },
      });
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
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

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp credentials not configured');
    }

    try {
      const response = await axios.post(
        `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
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
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      console.error('WhatsApp API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }
}
