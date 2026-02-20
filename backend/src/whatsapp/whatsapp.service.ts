import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { WhatsappSessionService } from '../whatsapp-session/whatsapp-session.service';
import { SettingsService } from '../settings/settings.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import { WhatsappEcommerceService } from '../ecommerce/whatsapp-ecommerce.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private prisma: PrismaService,
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService,
    private sessionService: WhatsappSessionService,
    private settingsService: SettingsService,
    private chatbotService: ChatbotService,
    private ecommerceService: WhatsappEcommerceService
  ) {}

  private async getSettings(userId: number) {
    const settings = await this.settingsService.getCurrentSettings(userId);
    if (!settings) {
      throw new Error('WhatsApp settings not configured. Please configure settings first.');
    }
    return settings;
  }

  async handleIncomingMessage(message: any, userId: number) {
    const from = message.from;
    const messageId = message.id;
    let text = message.text?.body;
    const image = message.image;
    const video = message.video;
    const document = message.document;
    const audio = message.audio;
    
    this.logger.log(`📨 Incoming message type: ${message.type}`);
    
    // Handle Meta Catalog order messages (when order management is enabled)
    if (message.type === 'order') {
      const order = message.order;
      this.logger.log('🛒 Meta Catalog order received:', JSON.stringify(order, null, 2));
      
      const settings = await this.getSettings(userId);
      const metaCatalogService = this.ecommerceService['metaCatalogService'];
      
      if (metaCatalogService) {
        await metaCatalogService.handleOrderMessage(from, settings.phoneNumberId, order, userId);
      }
      return;
    }
    
    // Handle interactive nfm_reply (catalog cart sent)
    if (message.type === 'interactive' && message.interactive?.type === 'nfm_reply') {
      this.logger.log('🛒 Catalog cart message received');
      const nfmReply = message.interactive.nfm_reply;
      const orderData = JSON.parse(nfmReply.response_json || '{}');
      
      const settings = await this.getSettings(userId);
      const metaCatalogService = this.ecommerceService['metaCatalogService'];
      
      if (metaCatalogService && orderData) {
        await metaCatalogService.handleOrderMessage(from, settings.phoneNumberId, orderData, userId);
      }
      return;
    }
    
    // Handle interactive button clicks
    if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
      const buttonId = message.interactive.button_reply.id;
      const buttonTitle = message.interactive.button_reply.title;
      text = buttonId; // Use the button ID as the message text for ecommerce
      this.logger.log(`Button clicked: ${buttonTitle} (ID: ${buttonId})`);
    }

    // Handle interactive list replies
    if (message.type === 'interactive' && message.interactive?.type === 'list_reply') {
      const listId = message.interactive.list_reply.id;
      const listTitle = message.interactive.list_reply.title;
      text = listId; // Use the list ID as the message text
      this.logger.log(`List item selected: ${listTitle} (ID: ${listId})`);
    }

    // Check if message is "stop" or "yes" and handle labels
    if (text) {
      const lowerText = text.toLowerCase().trim();
      
      // Check if manually edited to avoid auto-labeling
      const chatLabel = await this.prisma.chatLabel.findUnique({
        where: { phone: from },
      });

      const isManuallyEdited = chatLabel?.manuallyEdited || false;

      if (!isManuallyEdited) {
        if (lowerText === 'stop') {
          // Add Stop label
          await this.prisma.chatLabel.upsert({
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
          
          await this.prisma.chatLabel.upsert({
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
    const existingMessage = await this.prisma.whatsAppMessage.findUnique({
      where: { messageId }
    });

    if (existingMessage) {
      this.logger.log(`Message ${messageId} already exists, skipping`);
      return;
    }

    await this.prisma.whatsAppMessage.create({
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

      // Check for ecommerce keywords first
      if (['shop', 'catalog', 'products', 'buy'].includes(lowerText) || 
          lowerText.startsWith('cat:') || 
          lowerText.startsWith('sub:') || 
          lowerText.startsWith('prod:') ||
          lowerText.startsWith('buy:') ||
          lowerText === 'cod') {
        try {
          const settings = await this.getSettings(userId);
          await this.ecommerceService.handleIncomingMessage(from, text, settings.accessToken, settings.phoneNumberId, userId);
          return;
        } catch (error) {
          this.logger.error('Ecommerce service error:', error);
        }
      }

      // Check if user is providing order details (NAME and ADDRESS)
      if (lowerText.includes('name:') && lowerText.includes('address:')) {
        try {
          const orderCreated = await this.ecommerceService.createOrderFromMessage(from, text, userId);
          if (orderCreated) {
            await this.sendMessage(from, '✅ Order placed successfully! We will contact you soon for delivery. Thank you for shopping with us!', userId);
            return;
          }
        } catch (error) {
          this.logger.error('Order creation error:', error);
        }
      }

      // Check if user is in order flow (awaiting name, address, city, or pincode)
      try {
        const settings = await this.getSettings(userId);
        const metaCatalogService = this.ecommerceService['metaCatalogService'];
        
        if (metaCatalogService) {
          const handled = await metaCatalogService.handleCustomerResponse(from, settings.phoneNumberId, text, userId);
          if (handled) return;
        }
        
        const orderResult = await this.ecommerceService.createOrderFromMessage(from, text, userId);
        if (orderResult === 'awaiting_address') {
          await this.sendMessage(from, 'Thank you! Now please provide your complete delivery address:', userId);
          return;
        } else if (orderResult === 'awaiting_city') {
          await this.sendMessage(from, 'Thank you! Now please provide your city:', userId);
          return;
        } else if (orderResult === 'awaiting_pincode') {
          await this.sendMessage(from, 'Thank you! Finally, please provide your pincode:', userId);
          return;
        } else if (orderResult === true) {
          await this.sendMessage(from, '✅ Order placed successfully! We will contact you soon for delivery. Thank you for shopping with us!', userId);
          return;
        }
      } catch (error) {
        this.logger.error('Order creation error:', error);
      }

      // Get tenant config to check if AI chatbot is enabled
      const tenantConfig = await this.prisma.tenantConfig.findFirst({
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
    try {
      await this.prisma.whatsAppMessage.updateMany({
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
      const message = await this.prisma.whatsAppMessage.findFirst({
        where: { messageId }
      });
      return message?.status || 'unknown';
    } catch (error) {
      this.logger.error('Error getting message status:', error);
      return 'unknown';
    }
  }

  async findUserByPhoneNumberId(phoneNumberId: string): Promise<number | null> {
    try {
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true }
      });
      
      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        const settings = await tenantClient.whatsAppSettings.findFirst({
          where: { phoneNumberId },
          select: { id: true }
        });
        
        if (settings) {
          return settings.id;
        }
      }
      return null;
    } catch (error) {
      this.logger.error('Error finding user by phone number ID:', error);
      return null;
    }
  }

  async findAllUsersByPhoneNumberId(phoneNumberId: string): Promise<number[]> {
    try {
      const userIds: number[] = [];
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true }
      });
      
      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        const settings = await tenantClient.whatsAppSettings.findMany({
          where: { phoneNumberId },
          select: { id: true }
        });
        
        userIds.push(...settings.map(s => s.id));
      }
      return userIds;
    } catch (error) {
      this.logger.error('Error finding users by phone number ID:', error);
      return [];
    }
  }

  async findFirstActiveUser(): Promise<number | null> {
    try {
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true }
      });
      
      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        const settings = await tenantClient.whatsAppSettings.findFirst({
          where: { 
            accessToken: { not: '' },
            phoneNumberId: { not: '' }
          },
          select: { id: true }
        });
        
        if (settings) {
          return settings.id;
        }
      }
      return null;
    } catch (error) {
      this.logger.error('Error finding first active user:', error);
      return null;
    }
  }

  async validateVerifyToken(token: string): Promise<boolean> {
    try {
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true }
      });
      
      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        const settings = await tenantClient.whatsAppSettings.findFirst({
          where: { verifyToken: token }
        });
        
        if (settings) {
          return true;
        }
      }
      return false;
    } catch (error) {
      this.logger.error('Error validating verify token:', error);
      return false;
    }
  }

  async findUserByVerifyToken(token: string): Promise<number | null> {
    try {
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true }
      });
      
      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        const settings = await tenantClient.whatsAppSettings.findFirst({
          where: { verifyToken: token },
          select: { id: true }
        });
        
        if (settings) {
          return settings.id;
        }
      }
      return null;
    } catch (error) {
      this.logger.error('Error finding user by verify token:', error);
      return null;
    }
  }

  async getMessages(userId: number, phoneNumber?: string) {
    return this.prisma.whatsAppMessage.findMany({
      where: { ...(phoneNumber && { from: phoneNumber }) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async handleIncomingMessageWithoutContext(message: any, phoneNumberId: string) {
    try {
      const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
      
      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        const settings = await tenantClient.whatsAppSettings.findFirst({
          where: { phoneNumberId },
          select: { id: true }
        });
        
        if (settings) {
          const from = message.from;
          const messageId = message.id;
          let text = message.text?.body;
          
          // Handle Meta Catalog order messages
          if (message.type === 'order') {
            const order = message.order;
            this.logger.log('🛒 Meta Catalog order received:', JSON.stringify(order, null, 2));
            
            const whatsappSettings = await tenantClient.whatsAppSettings.findFirst();
            if (whatsappSettings) {
              const metaCatalogService = this.ecommerceService['metaCatalogService'];
              if (metaCatalogService) {
                await metaCatalogService.handleOrderMessage(from, whatsappSettings.phoneNumberId, order, settings.id);
                this.logger.log('✅ Order message handled');
              }
            }
            return;
          }
          
          if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
            text = message.interactive.button_reply.id;
          }
          
          if (message.type === 'interactive' && message.interactive?.type === 'list_reply') {
            text = message.interactive.list_reply.id;
          }
          
          const existingMessage = await tenantClient.whatsAppMessage.findUnique({
            where: { messageId }
          });
          
          if (existingMessage) {
            this.logger.log(`Message ${messageId} already exists in tenant ${tenant.id}, skipping`);
            continue;
          }
          
          await tenantClient.whatsAppMessage.create({
            data: {
              messageId,
              to: from,
              from,
              message: text || 'media message',
              direction: 'incoming',
              status: 'received',
            }
          });
          
          this.logger.log(`✓ Message stored successfully in tenant ${tenant.id}`);
          
          // Process auto-reply, ecommerce, chatbot
          if (text) {
            const lowerText = text.toLowerCase().trim();
            
            // Check if user is in Meta Catalog order flow first
            const whatsappSettings = await tenantClient.whatsAppSettings.findFirst();
            if (whatsappSettings) {
              const metaCatalogService = this.ecommerceService['metaCatalogService'];
              if (metaCatalogService) {
                const handled = await metaCatalogService.handleCustomerResponse(from, whatsappSettings.phoneNumberId, text, settings.id);
                if (handled) {
                  this.logger.log('✅ Meta Catalog order flow handled');
                  return;
                }
              }
            }
            
            // Check for ecommerce keywords
            if (['shop', 'catalog', 'products', 'buy'].includes(lowerText) || 
                lowerText.startsWith('cat:') || 
                lowerText.startsWith('sub:') || 
                lowerText.startsWith('prod:') ||
                lowerText.startsWith('buy:') ||
                lowerText === 'cod') {
              try {
                this.logger.log(`🛒 Ecommerce keyword detected: ${lowerText}`);
                if (whatsappSettings) {
                  this.logger.log(`Found WhatsApp settings for tenant ${tenant.id}`);
                  await this.ecommerceService.handleIncomingMessage(from, text, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, settings.id);
                  this.logger.log(`✅ Ecommerce message handled successfully`);
                } else {
                  this.logger.error(`❌ No WhatsApp settings found for tenant ${tenant.id}`);
                }
              } catch (error) {
                this.logger.error('❌ Ecommerce service error:', error.message);
                this.logger.error('Error details:', error.response?.data || error);
              }
            }
            
            // Try session service for auto-reply/quick-reply
            let sessionHandled = false;
            try {
              const whatsappSettings = await tenantClient.whatsAppSettings.findFirst();
              if (whatsappSettings) {
                sessionHandled = await this.sessionService.handleInteractiveMenu(from, text, settings.id, 
                  async (to, msg, imageUrl) => {
                    if (imageUrl) {
                      return this.sendMediaMessageDirect(to, imageUrl, 'image', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient, msg);
                    }
                    return this.sendMessageDirect(to, msg, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
                  },
                  async (to, msg, buttons) => {
                    return this.sendButtonsMessageDirect(to, msg, buttons, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
                  }
                );
              }
            } catch (error) {
              this.logger.error('Session service error:', error);
            }
            
            // Try AI chatbot if session didn't handle it
            if (!sessionHandled) {
              try {
                const tenantConfig = await tenantClient.tenantConfig.findFirst({
                  select: { aiChatbotEnabled: true }
                });
                
                if (tenantConfig?.aiChatbotEnabled) {
                  const chatResponse = await this.chatbotService.processMessage(settings.id, {
                    message: text,
                    phone: from
                  });
                  
                  if (chatResponse.response) {
                    const whatsappSettings = await tenantClient.whatsAppSettings.findFirst();
                    if (whatsappSettings) {
                      await this.sendMessageDirect(from, chatResponse.response, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
                    }
                  }
                }
              } catch (error) {
                this.logger.error('Chatbot error:', error);
              }
            }
          }
          
          return;
        }
      }
      this.logger.warn(`No tenant found with phoneNumberId: ${phoneNumberId}`);
    } catch (error) {
      this.logger.error('Error handling incoming message:', error);
    }
  }

  async updateMessageStatusWithoutContext(messageId: string, status: string, phoneNumberId: string) {
    try {
      const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
      
      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        const updated = await tenantClient.whatsAppMessage.updateMany({
          where: { messageId },
          data: { status }
        });
        
        if (updated.count > 0) {
          this.logger.log(`Message ${messageId} status updated to ${status}`);
          return;
        }
      }
    } catch (error) {
      this.logger.error('Error updating message status:', error);
    }
  }

  async sendMessageDirect(to: string, message: string, accessToken: string, phoneNumberId: string, tenantClient: any) {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      await tenantClient.whatsAppMessage.create({
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
      this.logger.error('WhatsApp API Error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async sendMediaMessageDirect(to: string, mediaUrl: string, mediaType: string, accessToken: string, phoneNumberId: string, tenantClient: any, caption?: string) {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: mediaType,
          [mediaType]: { link: mediaUrl, caption }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      await tenantClient.whatsAppMessage.create({
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

  async sendButtonsMessageDirect(to: string, text: string, buttons: string[], accessToken: string, phoneNumberId: string, tenantClient: any) {
    try {
      const interactiveButtons = buttons.slice(0, 3).map((button, index) => ({
        type: 'reply',
        reply: {
          id: `btn_${index}`,
          title: button.length > 20 ? button.substring(0, 20) : button
        }
      }));
      
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
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
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      await tenantClient.whatsAppMessage.create({
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
    const results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }> = [];
   
    for (const contact of contacts) {
      const validationError = this.validatePhoneNumber(contact.phone);
      if (validationError) {
        results.push({ phoneNumber: contact.phone, success: false, error: validationError });
        continue;
      }

      const formattedPhone = this.formatPhoneNumber(contact.phone);

      try {
        this.logger.log(`Sending message to ${formattedPhone} with template ${templateName}`);
        this.logger.log(`API URL: ${settings.apiUrl}/${settings.phoneNumberId}/messages`);
        this.logger.log(`Template: ${templateName}, Language: ${settings.language}`);
        
        const components: any[] = [];
        
        // Only add header if explicitly provided via headerImageUrl parameter
        if (headerImageUrl && headerImageUrl.trim() !== '' && headerImageUrl.startsWith('http')) {
          this.logger.log(`Adding header media: ${headerImageUrl}`);
          
          // Detect if it's a video or image based on file extension
          const isVideo = /\.(mp4|avi|mov)$/i.test(headerImageUrl);
          const mediaType = isVideo ? 'video' : 'image';
          
          this.logger.log(`Detected media type: ${mediaType}`);
          
          components.push({
            type: 'header',
            parameters: [
              {
                type: mediaType,
                [mediaType]: {
                  link: headerImageUrl
                }
              }
            ]
          });
        } else {
          this.logger.log('No header media provided, sending template without header');
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
        
        this.logger.log('Request body:', JSON.stringify(requestBody, null, 2));
        
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
        
        this.logger.log('WhatsApp API Response:', JSON.stringify(response.data, null, 2));

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