import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { WhatsappSessionService } from '../whatsapp-session/whatsapp-session.service';
import { SettingsService } from '../settings/settings.service';
import { ChatbotService } from '../chatbot/chatbot.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private prisma: PrismaService,
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService,
    private sessionService: WhatsappSessionService,
    private settingsService: SettingsService,
    private chatbotService: ChatbotService
  ) {}

  async findAllUsersByPhoneNumberId(phoneNumberId: string): Promise<number[]> {
    const mappings = await this.centralPrisma.phoneNumberMapping.findMany({
      where: { phoneNumberId },
      select: { tenantId: true }
    });
    return mappings.map(m => m.tenantId);
  }

  private async getSettings(userId: number) {
    const settings = await this.settingsService.getCurrentSettings(userId);
    if (!settings) {
      throw new Error('WhatsApp settings not configured. Please configure settings first.');
    }
    return settings;
  }

  async handleIncomingMessage(message: any, userId: number) {
    // Get tenant database connection
    const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: userId } });
    if (!tenant) {
      this.logger.error(`Tenant ${userId} not found`);
      return;
    }
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    const prisma = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

    const from = message.from;
    const messageId = message.id;
    let text = message.text?.body;
    const image = message.image;
    const video = message.video;
    const document = message.document;
    const audio = message.audio;
    
    // Handle interactive button clicks
    if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
      const buttonTitle = message.interactive.button_reply.title;
      text = buttonTitle; // Use the button title as the message text
      this.logger.log(`Button clicked: ${buttonTitle}`);
    }

    // Check if message is "stop" or "yes" and handle labels
    if (text) {
      const lowerText = text.toLowerCase().trim();
      
      // Check if manually edited to avoid auto-labeling
      const chatLabel = await prisma.chatLabel.findUnique({
        where: { phone: from },
      });

      const isManuallyEdited = chatLabel?.manuallyEdited || false;

      if (!isManuallyEdited) {
        if (lowerText === 'stop') {
          // Add Stop label
          await prisma.chatLabel.upsert({
            where: { phone: from },
            update: { labels: { set: ['Stop'] } },
            create: { phone: from, labels: ['Stop'] },
          });
          this.logger.log(`Added 'Stop' label to ${from}`);
        } else if (lowerText === 'yes') {
          // Remove Stop label if present, add Yes label
          const currentLabels = chatLabel?.labels || [];
          const updatedLabels = currentLabels.filter(l => l.toLowerCase() !== 'stop');
          if (!updatedLabels.includes('Yes')) {
            updatedLabels.push('Yes');
          }
          
          await prisma.chatLabel.upsert({
            where: { phone: from },
            update: { labels: { set: updatedLabels } },
            create: { phone: from, labels: ['Yes'] },
          });
          this.logger.log(`Removed 'Stop' label and added 'Yes' label to ${from}`);
        }
      }
    }

    let mediaType: string | null = null;
    let mediaUrl: string | null = null;

    if (image) {
      mediaType = 'image';
      mediaUrl = await this.downloadMedia(image.id, userId);
    } else if (video) {
      mediaType = 'video';
      mediaUrl = await this.downloadMedia(video.id, userId);
    } else if (document) {
      mediaType = 'document';
      mediaUrl = await this.downloadMedia(document.id, userId);
    } else if (audio) {
      mediaType = 'audio';
      mediaUrl = await this.downloadMedia(audio.id, userId);
    }

    this.logger.log(`Storing incoming message: from=${from}, to=${from}, message=${text || (mediaType ? `${mediaType} file` : 'button click')}`);
    
    // Check if message already exists
    const existingMessage = await prisma.whatsAppMessage.findUnique({
      where: { messageId }
    });

    if (existingMessage) {
      this.logger.log(`Message ${messageId} already exists, skipping`);
      return;
    }

    await prisma.whatsAppMessage.create({
      data: {
        messageId,
        to: from,
        from,
        message: text || (mediaType ? `${mediaType} file` : 'button interaction'),
        mediaType,
        mediaUrl,
        direction: 'incoming',
        status: 'received',
      }
    });

    if (text) {
      const lowerText = text.toLowerCase().trim();
      
      // Skip auto-reply/chatbot if message is "stop" or "yes"
      if (lowerText === 'stop' || lowerText === 'yes') {
        this.logger.log(`Skipping auto-reply/chatbot for ${lowerText} message`);
        return;
      }

      // Get tenant config to check if AI chatbot is enabled
      const tenantConfig = await prisma.tenantConfig.findFirst({
        select: { aiChatbotEnabled: true }
      });

      // Try session service first (auto-reply, quick-reply)
      const sessionHandled = await this.sessionService.handleInteractiveMenu(from, text, userId, 
        async (to, msg, imageUrl) => {
          if (imageUrl) {
            return this.sendMediaMessage(to, imageUrl, 'image', userId, msg);
          }
          return this.sendMessage(to, msg, userId);
        },
        async (to, msg, buttons) => {
          return this.sendButtonsMessage(to, msg, buttons, userId);
        }
      );

      // Only try chatbot if session service didn't handle it AND AI chatbot is enabled
      if (!sessionHandled && tenantConfig?.aiChatbotEnabled) {
        try {
          const chatResponse = await this.chatbotService.processMessage(userId, {
            message: text,
            phone: from
          });
          
          if (chatResponse.response) {
            await this.sendMessage(from, chatResponse.response, userId);
          }
        } catch (error) {
          this.logger.error('Chatbot error:', error);
        }
      }
    }

    this.logger.log(`Message from ${from}: ${text || mediaType}`);
  }

  async downloadMedia(mediaId: string, userId: number): Promise<string | null> {
    try {
      const settings = await this.getSettings(userId);
      this.logger.log(`Downloading media: ${mediaId}`);
     
      const mediaInfoResponse = await axios.get(
        `${settings.apiUrl}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${settings.accessToken}`
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
          'Authorization': `Bearer ${settings.accessToken}`
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

  async sendButtonsMessage(to: string, text: string, buttons: string[], userId: number) {
    try {
      const settings = await this.getSettings(userId);
      
      const interactiveButtons = buttons.slice(0, 3).map((button, index) => ({
        type: 'reply',
        reply: {
          id: `btn_${index}`,
          title: button.length > 20 ? button.substring(0, 20) : button
        }
      }));
      
      const response = await axios.post(
        `${settings.apiUrl}/${settings.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text },
            action: {
              buttons: interactiveButtons
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${settings.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      await this.prisma.whatsAppMessage.create({
        data: {
          messageId: response.data.messages[0].id,
          to,
          from: to,
          message: `Interactive buttons: ${text}`,
          direction: 'outgoing',
          status: 'sent',
        }
      });

      return { success: true, messageId: response.data.messages[0].id };
    } catch (error) {
      this.logger.error('WhatsApp Buttons API Error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async sendMessage(to: string, message: string, userId: number) {
    try {
      const settings = await this.getSettings(userId);
      
      this.logger.log(`Sending message to ${to}: ${message}`);
      this.logger.log(`Using API URL: ${settings.apiUrl}/${settings.phoneNumberId}/messages`);

      const response = await axios.post(
        `${settings.apiUrl}/${settings.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${settings.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.logger.log('WhatsApp API Response:', response.data);

      await this.prisma.whatsAppMessage.create({
        data: {
          messageId: response.data.messages[0].id,
          to,
          from: to,
          message,
          direction: 'outgoing',
          status: 'sent',
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

  async sendMediaMessage(to: string, mediaUrl: string, mediaType: string, userId: number, caption?: string) {
    try {
      const settings = await this.getSettings(userId);
      
      const response = await axios.post(
        `${settings.apiUrl}/${settings.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: mediaType,
          [mediaType]: { link: mediaUrl, caption }
        },
        {
          headers: {
            'Authorization': `Bearer ${settings.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      await this.prisma.whatsAppMessage.create({
        data: {
          messageId: response.data.messages[0].id,
          to,
          from: to,
          message: caption || `${mediaType} file`,
          mediaType,
          mediaUrl,
          direction: 'outgoing',
          status: 'sent',
        }
      });

      return { success: true, messageId: response.data.messages[0].id };
    } catch (error) {
      this.logger.error('WhatsApp Media API Error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async updateMessageStatus(messageId: string, status: string) {
    // Webhooks don't have tenant context, so we skip updating message status
    // Message status updates would need to be handled differently in multi-tenant setup
    this.logger.log(`Message ${messageId} status: ${status} (not persisted in multi-tenant mode)`);
    return { messageId, status };
  }

  async getMessageStatus(messageId: string) {
    // In multi-tenant mode, message status queries need tenant context
    this.logger.log(`Message status query for ${messageId} (not available in multi-tenant mode)`);
    return 'unknown';
  }

  async findUserByPhoneNumberId(phoneNumberId: string): Promise<number | null> {
    // In database-level multi-tenancy, this method is not applicable
    // Return null or throw error
    return null;
  }



  async findFirstActiveUser(): Promise<number | null> {
    // In database-level multi-tenancy, this method is not applicable
    return null;
  }

  async validateVerifyToken(token: string): Promise<boolean> {
    // In multi-tenant mode, verify token validation needs to check all tenant databases
    // For now, return true to allow webhooks
    this.logger.log(`Verify token validation for ${token} (bypassed in multi-tenant mode)`);
    return true;
  }

  async findUserByVerifyToken(token: string): Promise<number | null> {
    // In database-level multi-tenancy, this method is not applicable
    return null;
  }

  async getMessages(userId: number, phoneNumber?: string) {
    return this.prisma.whatsAppMessage.findMany({
      where: { ...(phoneNumber && { from: phoneNumber }) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendBulkTemplateMessage(phoneNumbers: string[], templateName: string, userId: number, parameters?: any[]) {
    const settings = await this.getSettings(userId);
    const results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }> = [];
   
    for (const phoneNumber of phoneNumbers) {
      try {
        // Build template components
        const components: any[] = [];
        
        // Add body parameters if provided
        if (parameters && parameters.length > 0) {
          components.push({
            type: 'body',
            parameters: parameters.map(param => ({ type: 'text', text: param }))
          });
        }
        
        const response = await axios.post(
          `${settings.apiUrl}/${settings.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'template',
            template: {
              name: templateName,
              language: { code: settings.language || 'en' },
              components: components
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${settings.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        await this.prisma.whatsAppMessage.create({
          data: {
            messageId: response.data.messages[0].id,
            to: phoneNumber,
            from: phoneNumber,
            message: `Template ${templateName} sent`,
            direction: 'outgoing',
            status: 'sent',
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

  async sendBulkTemplateMessageWithNames(contacts: Array<{name: string; phone: string}>, templateName: string, userId: number, settingsId?: number, headerImageUrl?: string) {
    let settings;
    if (settingsId) {
      settings = await this.prisma.whatsAppSettings.findUnique({ where: { id: settingsId } });
      if (!settings) {
        throw new Error('Specified settings not found');
      }
    } else {
      settings = await this.getSettings(userId);
    }
    
    // Upload image to Meta if provided
    let mediaId: string | null = null;
    if (headerImageUrl && headerImageUrl.trim() !== '' && headerImageUrl.startsWith('http')) {
      try {
        mediaId = await this.uploadMediaToMeta(headerImageUrl, settings);
        this.logger.log(`Image uploaded to Meta, media ID: ${mediaId}`);
      } catch (error) {
        this.logger.error('Failed to upload image to Meta:', error.message);
      }
    }
    
    const results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }> = [];
   
    for (const contact of contacts) {
      const validationError = this.validatePhoneNumber(contact.phone);
      if (validationError) {
        results.push({ phoneNumber: contact.phone, success: false, error: validationError });
        continue;
      }

      const formattedPhone = this.formatPhoneNumber(contact.phone);

      try {
        const components: any[] = [];
        
        // Use media ID instead of link if available
        if (mediaId) {
          components.push({
            type: 'header',
            parameters: [{ type: 'image', image: { id: mediaId } }]
          });
        }
        
        const requestBody = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: settings.language || 'en' },
            ...(components.length > 0 && { components })
          }
        };
        
        const response = await axios.post(
          `${settings.apiUrl}/${settings.phoneNumberId}/messages`,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${settings.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        await this.prisma.whatsAppMessage.create({
          data: {
            messageId: response.data.messages[0].id,
            to: formattedPhone,
            from: formattedPhone,
            message: `Template ${templateName} sent to ${contact.name}`,
            direction: 'outgoing',
            status: 'sent',
          }
        });

        results.push({ phoneNumber: formattedPhone, success: true, messageId: response.data.messages[0].id });
      } catch (error) {
        const errorMsg = this.getErrorMessage(error);
        this.logger.error(`Failed to send to ${contact.phone}:`, {
          error: errorMsg,
          response: error.response?.data,
          status: error.response?.status
        });
        results.push({ phoneNumber: formattedPhone, success: false, error: errorMsg });
      }
    }

    return results;
  }

  private async uploadMediaToMeta(imageUrl: string, settings: any): Promise<string> {
    try {
      // Download image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const FormData = require('form-data');
      const form = new FormData();
      
      form.append('file', Buffer.from(imageResponse.data), {
        filename: 'image.jpg',
        contentType: imageResponse.headers['content-type'] || 'image/jpeg'
      });
      form.append('messaging_product', 'whatsapp');
      
      // Upload to Meta
      const uploadResponse = await axios.post(
        `${settings.apiUrl}/${settings.phoneNumberId}/media`,
        form,
        {
          headers: {
            'Authorization': `Bearer ${settings.accessToken}`,
            ...form.getHeaders()
          }
        }
      );
      
      return uploadResponse.data.id;
    } catch (error) {
      this.logger.error('Media upload to Meta failed:', error.response?.data || error.message);
      throw error;
    }
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

  private formatPhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // If phone number is 10 digits and starts with 6-9, add India country code
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
      return `91${cleanPhone}`;
    }
    
    // If already has country code, return as is
    return cleanPhone;
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

  async sendOrderConfirmation(order: any, userId: number) {
    const settings = await this.getSettings(userId);
    const phoneNumber = order.shippingAddress.mobile;
    const name = order.shippingAddress.fullName;

    try {
      const response = await axios.post(
        `${settings.apiUrl}/${settings.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'template',
          template: {
            name: 'order_received_v1',
            language: { code: settings.language || 'en' },
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
            'Authorization': `Bearer ${settings.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      await this.prisma.whatsAppMessage.create({
        data: {
          messageId: response.data.messages[0].id,
          to: phoneNumber,
          from: phoneNumber,
          message: `Order ${order.id} confirmation sent`,
          direction: 'outgoing',
          status: 'sent',
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