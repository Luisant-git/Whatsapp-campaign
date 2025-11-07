import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma.service';
import { WhatsappSessionService } from '../whatsapp-session/whatsapp-session.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiUrl = process.env.WHATSAPP_API_URL;
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private readonly accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  constructor(
    private prisma: PrismaService,
    private sessionService: WhatsappSessionService
  ) {}

  async handleIncomingMessage(message: any) {
    const from = message.from;
    const messageId = message.id;
    const text = message.text?.body;
    const image = message.image;
    const video = message.video;
    const document = message.document;
    const audio = message.audio;

    let mediaType: string | null = null;
    let mediaUrl: string | null = null;

    if (image) {
      mediaType = 'image';
      mediaUrl = await this.downloadMedia(image.id);
    } else if (video) {
      mediaType = 'video';
      mediaUrl = await this.downloadMedia(video.id);
    } else if (document) {
      mediaType = 'document';
      mediaUrl = await this.downloadMedia(document.id);
    } else if (audio) {
      mediaType = 'audio';
      mediaUrl = await this.downloadMedia(audio.id);
    }

    await this.prisma.whatsappMessage.create({
      data: {
        messageId,
        from,
        message: text || (mediaType ? `${mediaType} file` : null),
        mediaType,
        mediaUrl,
        direction: 'incoming',
        status: 'received'
      }
    });

    if (text) {
      await this.sessionService.handleInteractiveMenu(from, text, async (to, msg, imageUrl) => {
        if (imageUrl) {
          return this.sendMediaMessage(to, imageUrl, 'image', msg);
        }
        return this.sendMessage(to, msg);
      });
    }

    this.logger.log(`Message from ${from}: ${text || mediaType}`);
  }

  async downloadMedia(mediaId: string): Promise<string | null> {
    try {
      this.logger.log(`Downloading media: ${mediaId}`);
     
      const mediaInfoResponse = await axios.get(
        `${this.apiUrl}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
     
      this.logger.log('Media info:', mediaInfoResponse.data);
      const mediaUrl = mediaInfoResponse.data.url;
     
      if (!mediaUrl) {
        this.logger.error('No media URL found');
        return null;
      }
     
      const mediaDataResponse = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'arraybuffer'
      });

      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
     
      const ext = mediaInfoResponse.data.mime_type?.split('/')[1] || 'jpg';
      const filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
      const filepath = path.join('uploads', filename);
     
      fs.writeFileSync(filepath, mediaDataResponse.data);
     
      const finalUrl = `${process.env.UPLOAD_URL}/${filename}`;
      this.logger.log(`Media saved: ${finalUrl}`);
     
      return finalUrl;
    } catch (error) {
      this.logger.error('Media download error:', error.response?.data || error.message);
      return null;
    }
  }

  async sendMessage(to: string, message: string) {
    // Check configuration
    if (!this.apiUrl || !this.phoneNumberId || !this.accessToken) {
      this.logger.error('WhatsApp configuration missing');
      return { success: false, error: 'WhatsApp API configuration is incomplete' };
    }

    this.logger.log(`Sending message to ${to}: ${message}`);
    this.logger.log(`Using API URL: ${this.apiUrl}/${this.phoneNumberId}/messages`);

    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.logger.log('WhatsApp API Response:', response.data);

      await this.prisma.whatsappMessage.create({
        data: {
          messageId: response.data.messages[0].id,
          from: to,
          message,
          direction: 'outgoing',
          status: 'sent'
        }
      });

      return { success: true, messageId: response.data.messages[0].id };
    } catch (error) {
      this.logger.error('WhatsApp API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async sendMediaMessage(to: string, mediaUrl: string, mediaType: string, caption?: string) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: mediaType,
          [mediaType]: { link: mediaUrl, caption }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      await this.prisma.whatsappMessage.create({
        data: {
          messageId: response.data.messages[0].id,
          from: to,
          message: caption || `${mediaType} file`,
          mediaType,
          mediaUrl,
          direction: 'outgoing',
          status: 'sent'
        }
      });

      return { success: true, messageId: response.data.messages[0].id };
    } catch (error) {
      this.logger.error('WhatsApp Media API Error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async updateMessageStatus(messageId: string, status: string) {
    try {
      await this.prisma.whatsappMessage.updateMany({
        where: { messageId },
        data: { status }
      });
      this.logger.log(`Message ${messageId} status updated to ${status}`);
      return { messageId, status };
    } catch (error) {
      this.logger.error('Error updating message status:', error);
      return null;
    }
  }

  async getMessageStatus(messageId: string) {
    try {
      const message = await this.prisma.whatsappMessage.findFirst({
        where: { messageId }
      });
      return message?.status || 'unknown';
    } catch (error) {
      this.logger.error('Error getting message status:', error);
      return 'unknown';
    }
  }

  async getMessages(phoneNumber?: string) {
    return this.prisma.whatsappMessage.findMany({
      where: phoneNumber ? { from: phoneNumber } : {},
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendBulkTemplateMessage(phoneNumbers: string[], templateName: string, parameters?: any[]) {
    const results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }> = [];
   
    for (const phoneNumber of phoneNumbers) {
      try {
        const response = await axios.post(
          `${this.apiUrl}/${this.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'en' },
              components: parameters ? [
                {
                  type: 'body',
                  parameters: parameters.map(param => ({ type: 'text', text: param }))
                }
              ] : []
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        await this.prisma.whatsappMessage.create({
          data: {
            messageId: response.data.messages[0].id,
            from: phoneNumber,
            message: `Template ${templateName} sent`,
            direction: 'outgoing',
            status: 'sent'
          }
        });

        results.push({ phoneNumber, success: true, messageId: response.data.messages[0].id });
      } catch (error) {
        this.logger.error(`Failed to send to ${phoneNumber}:`, error.response?.data || error.message);
        results.push({ phoneNumber, success: false, error: error.message });
      }
    }

    return results;
  }

  async sendBulkTemplateMessageWithNames(contacts: Array<{name: string; phone: string}>, templateName: string) {
    // Check configuration first
    if (!this.apiUrl || !this.phoneNumberId || !this.accessToken) {
      this.logger.error('WhatsApp configuration missing:', {
        hasApiUrl: !!this.apiUrl,
        hasPhoneNumberId: !!this.phoneNumberId,
        hasAccessToken: !!this.accessToken
      });
      throw new Error('WhatsApp API configuration is incomplete. Please check environment variables.');
    }

    const results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }> = [];
   
    for (const contact of contacts) {
      const validationError = this.validatePhoneNumber(contact.phone);
      if (validationError) {
        results.push({ phoneNumber: contact.phone, success: false, error: validationError });
        continue;
      }

      try {
        this.logger.log(`Sending message to ${contact.phone} with template ${templateName}`);
        
        const response = await axios.post(
          `${this.apiUrl}/${this.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: contact.phone,
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'en' },
              components: contact.name ? [
                {
                  type: 'body',
                  parameters: [{ type: 'text', text: contact.name }]
                }
              ] : []
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        await this.prisma.whatsappMessage.create({
          data: {
            messageId: response.data.messages[0].id,
            from: contact.phone,
            message: `Template ${templateName} sent to ${contact.name}`,
            direction: 'outgoing',
            status: 'sent'
          }
        });

        results.push({ phoneNumber: contact.phone, success: true, messageId: response.data.messages[0].id });
      } catch (error) {
        const errorMsg = this.getErrorMessage(error);
        this.logger.error(`Failed to send to ${contact.phone}:`, {
          error: errorMsg,
          response: error.response?.data,
          status: error.response?.status
        });
        results.push({ phoneNumber: contact.phone, success: false, error: errorMsg });
      }
    }

    return results;
  }

  private validatePhoneNumber(phone: string): string | null {
    if (!phone || phone.trim() === '') {
      return 'Phone number is required';
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
   
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return 'Invalid phone number format';
    }
    if (!/^[1-9]/.test(cleanPhone)) {
      return 'Phone number cannot start with 0';
    }
   
    // Block repeated digits (1111111111, 2222222222, etc.)
    if (/^(\d)\1{9,}$/.test(cleanPhone)) {
      return 'Invalid phone number - not registered on WhatsApp';
    }
   
    // Block sequential numbers (1234567890, 0123456789)
    if (cleanPhone === '1234567890' || cleanPhone === '0123456789' ||
        cleanPhone === '9876543210' || cleanPhone === '0987654321') {
      return 'Invalid phone number - not registered on WhatsApp';
    }
   
    return null;
  }

  private getErrorMessage(error: any): string {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      if (apiError.code === 131026) {
        return 'Number not registered on WhatsApp';
      }
      if (apiError.code === 131047) {
        return 'Message failed to send - Invalid number';
      }
      if (apiError.code === 131051) {
        return 'Unsupported message type';
      }
      return apiError.message || 'WhatsApp API error';
    }
    return error.message || 'Failed to send message';
  }

  async getAnalytics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalMessages, todayMessages, successfulDeliveries, failedMessages, totalContacts] = await Promise.all([
      this.prisma.whatsappMessage.count(),
      this.prisma.whatsappMessage.count({
        where: { createdAt: { gte: today } }
      }),
      this.prisma.whatsappMessage.count({
        where: { status: { in: ['delivered', 'read'] } }
      }),
      this.prisma.whatsappMessage.count({
        where: { status: 'failed' }
      }),
      this.prisma.whatsappMessage.groupBy({
        by: ['from'],
        _count: { from: true }
      })
    ]);

    const deliveryRate = totalMessages > 0 ? (successfulDeliveries / totalMessages) * 100 : 0;

    return {
      totalMessages,
      todayMessages,
      successfulDeliveries,
      failedMessages,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      totalContacts: totalContacts.length
    };
  }

  async sendOrderConfirmation(order: any) {
    const phoneNumber = order.shippingAddress.mobile;
    const name = order.shippingAddress.fullName;

    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'template',
          template: {
            name: 'order_received_v1',
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: name },
                  { type: 'text', text: order.id.toString() },
                  { type: 'text', text: order.total }
                ]
              }
            ]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      await this.prisma.whatsappMessage.create({
        data: {
          messageId: response.data.messages[0].id,
          from: phoneNumber,
          message: `Order ${order.id} confirmation sent`,
          direction: 'outgoing',
          status: 'sent'
        }
      });

      this.logger.log(`WhatsApp message sent to ${phoneNumber}:`, response.data);
      return { success: true, messageId: response.data.messages[0].id };
    } catch (error) {
      this.logger.error('WhatsApp API Error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }
}