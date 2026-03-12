import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { WhatsappSessionService } from '../whatsapp-session/whatsapp-session.service';
import { SettingsService } from '../settings/settings.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import { WhatsappEcommerceService } from '../ecommerce/whatsapp-ecommerce.service';
import { PhoneRouterService } from './phone-router.service';
import { FlowTriggerService } from '../flow-message/flow-trigger.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private phoneNumberIdCache = new Map<string, { tenantId: number; settingsId: number; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor(
    private prisma: PrismaService,
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService,
    private sessionService: WhatsappSessionService,
    private settingsService: SettingsService,
    private chatbotService: ChatbotService,
    private ecommerceService: WhatsappEcommerceService,
    private phoneRouter: PhoneRouterService,
    private flowTriggerService: FlowTriggerService
  ) {}

  private async getSettings(userId: number) {
    const settings = await this.settingsService.getCurrentSettings(userId);
    if (!settings) {
      throw new Error('WhatsApp settings not configured. Please configure settings first.');
    }
    return settings;
  }

  private async getPhoneCredentials(featureType: 'whatsappChat' | 'campaigns' | 'ecommerce' | 'aiChatbot' | 'quickReply', userId: number) {
    const featureAssignment = await this.prisma.featureAssignment.findFirst();
    const assignedPhoneId = featureAssignment?.[featureType];

    if (assignedPhoneId) {
      const masterConfig = await this.prisma.masterConfig.findFirst({
        where: { phoneNumberId: assignedPhoneId }
      });
      if (masterConfig) {
        return {
          phoneNumberId: masterConfig.phoneNumberId,
          accessToken: masterConfig.accessToken,
          apiUrl: 'https://graph.facebook.com/v18.0'
        };
      }
    }

    // Fallback to default
    const settings = await this.getSettings(userId);
    return {
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
      apiUrl: settings.apiUrl
    };
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

    // Get phoneNumberId from settings
    const settings = await this.getSettings(userId);

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
        phoneNumberId: settings.phoneNumberId,
      }
    });

    if (text) {
      const lowerText = text.toLowerCase().trim();
      
      // Skip auto-reply/chatbot if message is "stop" or "yes"
      if (lowerText === 'stop' || lowerText === 'yes') {
        this.logger.log(`Skipping auto-reply/chatbot for ${lowerText} message`);
        return;
      }

      // Check for flow triggers first
      try {
        const settings = await this.getSettings(userId);
        const flowResult = await this.flowTriggerService.checkAndSendFlowWithClient(text, from, this.prisma, settings.accessToken, settings.phoneNumberId);
        if (flowResult?.success) {
          this.logger.log(`✅ Flow triggered: ${flowResult.trigger.name}`);
          return;
        }
      } catch (error) {
        this.logger.error('Flow trigger error:', error);
      }

      // Check for ecommerce keywords first
      if (['shop', 'catalog', 'products', 'buy'].includes(lowerText) || 
          lowerText.startsWith('cat:') || 
          lowerText.startsWith('sub:') || 
          lowerText.startsWith('prod:') ||
          lowerText.startsWith('buy:') ||
          lowerText === 'cod') {
        try {
          this.logger.log(`[Ecommerce] Processing keyword: ${lowerText}`);
          const settings = await this.getSettings(userId);
          await this.ecommerceService.handleIncomingMessage(from, text, settings.accessToken, settings.phoneNumberId, userId);
          this.logger.log(`[Ecommerce] Keyword handled successfully`);
          return;
        } catch (error) {
          this.logger.error('[Ecommerce] Error:', error.message);
        }
      }

      // Check if user is providing order details (NAME and ADDRESS)
      if (lowerText.includes('name:') && lowerText.includes('address:')) {
        try {
          const settings = await this.getSettings(userId);
          const orderCreated = await this.ecommerceService.createOrderFromMessage(from, text, userId, settings.accessToken, settings.phoneNumberId);
          if (orderCreated === 'order_placed') {
            return;
          }
        } catch (error) {
          this.logger.error('Order creation error:', error);
        }
      }

      // Check if user is in order flow (awaiting name, address, city, or pincode)
      try {
        const settings = await this.getSettings(userId);
        
        // Check current session step to determine which flow
        const currentStep = await this.ecommerceService['sessionService'].getStep(from, userId);
        const session = await this.ecommerceService['sessionService'].getSession(from, userId);
        const paymentMethod = session?.paymentMethod;
        
        // If user is in confirm_details step AND payment method is already COD, use regular ecommerce
        if (currentStep === 'confirm_details' && paymentMethod === 'COD') {
          const orderResult = await this.ecommerceService.createOrderFromMessage(from, text, userId, settings.accessToken, settings.phoneNumberId);
          if (orderResult === 'order_placed' || orderResult === 'awaiting_name' || orderResult === 'awaiting_address') {
            if (orderResult === 'awaiting_address') {
              await this.sendMessage(from, 'Thank you! Now please provide your complete delivery address:', userId);
            }
            return;
          }
        }
        
        // Try regular ecommerce order flow for other steps
        const orderResult = await this.ecommerceService.createOrderFromMessage(from, text, userId, settings.accessToken, settings.phoneNumberId);
        if (orderResult === 'awaiting_address') {
          await this.sendMessage(from, 'Thank you! Now please provide your complete delivery address:', userId);
          return;
        } else if (orderResult === 'awaiting_city') {
          await this.sendMessage(from, 'Thank you! Now please provide your city:', userId);
          return;
        } else if (orderResult === 'awaiting_pincode') {
          await this.sendMessage(from, 'Thank you! Finally, please provide your pincode:', userId);
          return;
        } else if (orderResult === 'order_placed') {
          return;
        }
        
        // If not handled by regular ecommerce, try Meta Catalog
        const metaCatalogService = this.ecommerceService['metaCatalogService'];
        if (metaCatalogService) {
          const handled = await metaCatalogService.handleCustomerResponse(from, settings.phoneNumberId, text, userId);
          if (handled) return;
        }
      } catch (error) {
        this.logger.error('Order creation error:', error);
      }

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
          phoneNumberId: settings.phoneNumberId,
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
      const { phoneNumberId, accessToken, apiUrl } = await this.getPhoneCredentials('whatsappChat', userId);
      
      this.logger.log(`Sending message to ${to}: ${message}`);
      this.logger.log(`Using API URL: ${apiUrl}/${phoneNumberId}/messages`);

      const response = await axios.post(
        `${apiUrl}/${phoneNumberId}/messages`,
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

      this.logger.log('WhatsApp API Response:', response.data);

      await this.prisma.whatsAppMessage.create({
        data: {
          messageId: response.data.messages[0].id,
          to,
          from: to,
          message,
          direction: 'outgoing',
          status: 'sent',
          phoneNumberId,
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
      const { phoneNumberId, accessToken, apiUrl } = await this.getPhoneCredentials('whatsappChat', userId);
      
      const response = await axios.post(
        `${apiUrl}/${phoneNumberId}/messages`,
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
          phoneNumberId,
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
    const messages = await this.prisma.whatsAppMessage.findMany({
      where: { ...(phoneNumber && { from: phoneNumber }) },
      orderBy: { createdAt: 'asc' },
    });

    // Enrich messages with display phone number from master config
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        let displayPhoneNumber: string | null = null;
        if (msg.phoneNumberId) {
          // First try to find master config
          const masterConfig = await this.prisma.masterConfig.findFirst({
            where: { phoneNumberId: msg.phoneNumberId },
            select: { name: true, phoneNumberId: true }
          });
          
          if (masterConfig) {
            displayPhoneNumber = `${masterConfig.name} - ${masterConfig.phoneNumberId}`;
          } else {
            // Fallback to settings name
            const settings = await this.prisma.whatsAppSettings.findFirst({
              where: { phoneNumberId: msg.phoneNumberId },
              select: { name: true, phoneNumberId: true }
            });
            displayPhoneNumber = settings?.name || msg.phoneNumberId || null;
          }
        }
        return {
          ...msg,
          displayPhoneNumber,
          businessPhoneNumberId: msg.phoneNumberId
        };
      })
    );

    return enrichedMessages;
  }

  async handleIncomingMessageWithoutContext(message: any, phoneNumberId: string) {
    try {
      this.logger.log(`📨 Webhook received - Phone: ${message.from}, Type: ${message.type}, Text: ${message.text?.body || 'N/A'}`);
      
      // Check cache first
      const cached = this.phoneNumberIdCache.get(phoneNumberId);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        this.logger.log(`Using cached tenant ${cached.tenantId} for phoneNumberId ${phoneNumberId}`);
        await this.processMessageForTenant(message, phoneNumberId, cached.tenantId, cached.settingsId);
        return;
      }

      // Cache miss - find tenant
      const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
      
      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        const settings = await tenantClient.whatsAppSettings.findFirst({
          where: { phoneNumberId },
          select: { id: true }
        });
        
        if (settings) {
          // Cache the mapping
          this.phoneNumberIdCache.set(phoneNumberId, {
            tenantId: tenant.id,
            settingsId: settings.id,
            timestamp: Date.now()
          });
          
          await this.processMessageForTenant(message, phoneNumberId, tenant.id, settings.id);
          return;
        }
      }
      this.logger.warn(`No tenant found with phoneNumberId: ${phoneNumberId}`);
    } catch (error) {
      this.logger.error('Error handling incoming message:', error);
    }
  }

  private async processMessageForTenant(message: any, phoneNumberId: string, tenantId: number, settingsId: number) {
    const dbUrl = await this.getTenantDbUrl(tenantId);
    const tenantClient = this.tenantPrisma.getTenantClient(tenantId.toString(), dbUrl);
    
    const from = message.from;
    const messageId = message.id;
    let text = message.text?.body;
    
    // 🔥 ROUTE BASED ON PHONE NUMBER ID
    const routing = await this.phoneRouter.routeMessage(phoneNumberId, message, settingsId, tenantClient, tenantId);
    this.logger.log(`📍 Routing: ${routing.route} for phone ${phoneNumberId}`);
    
    // Handle Meta Catalog order messages
    if (message.type === 'order') {
      const order = message.order;
      this.logger.log('🛒 Meta Catalog order received:', JSON.stringify(order, null, 2));
      
      const whatsappSettings = await tenantClient.whatsAppSettings.findFirst();
      if (whatsappSettings) {
        const metaCatalogService = this.ecommerceService['metaCatalogService'];
        if (metaCatalogService) {
          await metaCatalogService.handleOrderMessage(from, whatsappSettings.phoneNumberId, order, tenantId);
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
    
    // Quick duplicate check
    const existingMessage = await tenantClient.whatsAppMessage.findUnique({ where: { messageId } });
    if (existingMessage) {
      this.logger.log(`Message ${messageId} already exists, skipping`);
      return;
    }
    
    // Store message with phoneNumberId
    tenantClient.whatsAppMessage.create({
      data: {
        messageId,
        to: from,
        from,
        message: text || 'media message',
        direction: 'incoming',
        status: 'received',
        phoneNumberId,
      }
    }).catch(e => this.logger.error('Message store error:', e.message));
    
    this.logger.log(`✓ Message stored successfully`);
    
    // Process immediately
    if (text) {
      const lowerText = text.toLowerCase().trim();
      
      // Get settings once
      const whatsappSettings = await tenantClient.whatsAppSettings.findFirst({
        where: { phoneNumberId }
      });
      if (!whatsappSettings) return;
      
      // 🔥 CAMPAIGNS-ONLY NUMBER: Block incoming messages
      if (routing.route === 'campaigns-only') {
        this.logger.log('⛔ Campaigns-only number - ignoring incoming message');
        return;
      }

      // Check for flow triggers first
      try {
        const flowResult = await this.flowTriggerService.checkAndSendFlowWithClient(text, from, tenantClient, whatsappSettings.accessToken, whatsappSettings.phoneNumberId);
        if (flowResult?.success) {
          this.logger.log(`✅ Flow triggered: ${flowResult.trigger.name}`);
          return;
        }
      } catch (error) {
        this.logger.error('Flow trigger error:', error);
      }
      
      // 🔥 ECOMMERCE NUMBER: Route to catalog
      if (routing.route === 'ecommerce') {
        await this.ecommerceService.handleIncomingMessage(from, text, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantId);
        return;
      }
      
      // Check for ecommerce keywords first (before routing to AI bot)
      if (['shop', 'catalog', 'products', 'buy'].includes(lowerText) || 
          lowerText.startsWith('cat:') || 
          lowerText.startsWith('sub:') || 
          lowerText.startsWith('prod:') ||
          lowerText.startsWith('buy:') ||
          lowerText === 'cod') {
        await this.ecommerceService.handleIncomingMessage(from, text, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantId);
        this.logger.log(`✅ Ecommerce keyword handled`);
        return;
      }
      
      // 🔥 AI BOT NUMBER: Route to chatbot
      if (routing.route === 'ai-bot') {
        const chatResponse = await this.chatbotService.processMessage(tenantId, { message: text, phone: from });
        if (chatResponse.response) {
          await this.sendMessageDirect(from, chatResponse.response, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
        }
        return;
      }
      
      // 🔥 QUICK REPLY NUMBER: Route to session service
      if (routing.route === 'quick-reply') {
        // Check current session to determine which flow
        const currentStep = await this.ecommerceService['sessionService'].getStep(from, tenantId);
        const session = await this.ecommerceService['sessionService'].getSession(from, tenantId);
        const paymentMethod = session?.paymentMethod;
        
        // If user is in confirm_details step AND payment method is already COD, use regular ecommerce
        if (currentStep === 'confirm_details' && paymentMethod === 'COD') {
          const orderResult = await this.ecommerceService.createOrderFromMessage(from, text, tenantId, whatsappSettings.accessToken, whatsappSettings.phoneNumberId);
          if (orderResult === 'order_placed' || orderResult === 'awaiting_name' || orderResult === 'awaiting_address') {
            if (orderResult === 'awaiting_address') {
              await this.sendMessageDirect(from, 'Thank you! Now please provide your complete delivery address:', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
            }
            return;
          }
        }
        
        // Check if user is in Meta Catalog order flow
        const metaCatalogService = this.ecommerceService['metaCatalogService'];
        if (metaCatalogService) {
          const handled = await metaCatalogService.handleCustomerResponse(from, whatsappSettings.phoneNumberId, text, tenantId);
          if (handled) {
            this.logger.log('✅ Meta Catalog order flow handled in quick-reply');
            return;
          }
        }
        
        await this.sessionService.handleInteractiveMenu(from, text, settingsId, 
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
        return;
      }
      
      // Check if user is in Meta Catalog order flow first
      const metaCatalogService = this.ecommerceService['metaCatalogService'];
      if (metaCatalogService) {
        const handled = await metaCatalogService.handleCustomerResponse(from, whatsappSettings.phoneNumberId, text, tenantId);
        if (handled) {
          this.logger.log('✅ Meta Catalog order flow handled');
          return;
        }
      }
      
      // Check for ecommerce keywords
      if (['shop', 'catalog', 'products', 'buy'].includes(lowerText) || 
          lowerText.startsWith('cat:') || 
          lowerText.startsWith('sub:') || 
          lowerText.startsWith('prod:') ||
          lowerText.startsWith('buy:') ||
          lowerText === 'cod') {
        await this.ecommerceService.handleIncomingMessage(from, text, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantId);
        this.logger.log(`✅ Ecommerce keyword handled`);
        return;
      }
      
      // Check if user is in order flow
      const orderResult = await this.ecommerceService.createOrderFromMessage(from, text, tenantId, whatsappSettings.accessToken, whatsappSettings.phoneNumberId);
      if (orderResult === 'awaiting_address') {
        await this.sendMessageDirect(from, 'Thank you! Now please provide your complete delivery address:', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
        return;
      } else if (orderResult === 'awaiting_city') {
        await this.sendMessageDirect(from, 'Thank you! Now please provide your city:', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
        return;
      } else if (orderResult === 'awaiting_pincode') {
        await this.sendMessageDirect(from, 'Thank you! Finally, please provide your pincode:', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
        return;
      } else if (orderResult === 'order_placed') {
        return;
      }
      
      // Try session service for auto-reply/quick-reply
      const sessionHandled = await this.sessionService.handleInteractiveMenu(from, text, settingsId, 
        async (to, msg, imageUrl) => {
          if (imageUrl) {
            return this.sendMediaMessageDirect(to, imageUrl, 'image', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient, msg);
          }
          return this.sendMessageDirect(to, msg, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
        },
        async (to, msg, buttons) => {
          return this.sendButtonsMessageDirect(to, msg, buttons, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
        }
      ).catch(e => { this.logger.error('Session error:', e); return false; });
    }
  }

  private async getTenantDbUrl(tenantId: number): Promise<string> {
    const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');
    return `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
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
          phoneNumberId,
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
          phoneNumberId,
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
          phoneNumberId,
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
    // Use campaigns feature assignment
    const { phoneNumberId, accessToken, apiUrl } = await this.getPhoneCredentials('campaigns', userId);
    const language = 'en'; // Default language
    
    const results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }> = [];
   
    for (const contact of contacts) {
      const validationError = this.validatePhoneNumber(contact.phone);
      if (validationError) {
        results.push({ phoneNumber: contact.phone, success: false, error: validationError });
        continue;
      }

      const formattedPhone = this.formatPhoneNumber(contact.phone);

      try {
        this.logger.log(`Sending campaign message to ${formattedPhone} with template ${templateName}`);
        this.logger.log(`Using phone number: ${phoneNumberId}`);
        
        const components: any[] = [];
        
        if (headerImageUrl && headerImageUrl.trim() !== '' && headerImageUrl.startsWith('http')) {
          // Get template information to determine the correct header format
          let headerFormat = 'IMAGE'; // Default fallback
          
          try {
            // Try to get template from database to determine actual header format
            const template = await this.prisma.messageTemplate.findFirst({
              where: { name: templateName }
            });
            
            if (template && template.components) {
              const templateComponents = typeof template.components === 'string' 
                ? JSON.parse(template.components) 
                : template.components;
              
              const headerComponent = templateComponents.find((c: any) => c.type === 'HEADER');
              if (headerComponent && headerComponent.format) {
                headerFormat = headerComponent.format;
                this.logger.log(`Using template header format: ${headerFormat}`);
              }
            }
          } catch (error) {
            this.logger.warn('Could not determine template header format, using file extension detection');
            // Fallback to file extension detection
            const isVideo = /\.(mp4|avi|mov)$/i.test(headerImageUrl);
            const isDocument = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(headerImageUrl);
            
            if (isDocument) {
              headerFormat = 'DOCUMENT';
            } else if (isVideo) {
              headerFormat = 'VIDEO';
            } else {
              headerFormat = 'IMAGE';
            }
          }
          
          // Use the determined format
          const mediaType = headerFormat.toLowerCase();
          
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
        }
        
        // Add body parameters if the template has variables
        try {
          const template = await this.prisma.messageTemplate.findFirst({
            where: { name: templateName }
          });
          
          if (template && template.components) {
            const templateComponents = typeof template.components === 'string' 
              ? JSON.parse(template.components) 
              : template.components;
            
            const bodyComponent = templateComponents.find((c: any) => c.type === 'BODY');
            if (bodyComponent && bodyComponent.text) {
              // Count variables in body text ({{1}}, {{2}}, etc.)
              const variables = bodyComponent.text.match(/{{\d+}}/g);
              if (variables && variables.length > 0) {
                this.logger.log(`Template has ${variables.length} body parameters, using contact name: ${contact.name}`);
                
                // Create parameters array - use contact name for first parameter, repeat if more needed
                const bodyParameters: Array<{ type: string; text: string }> = [];
                for (let i = 0; i < variables.length; i++) {
                  bodyParameters.push({
                    type: 'text',
                    text: contact.name || 'Customer'
                  });
                }
                
                components.push({
                  type: 'body',
                  parameters: bodyParameters
                });
              }
            }
          }
        } catch (error) {
          this.logger.warn('Could not determine template body parameters:', error.message);
        }
        
        const requestBody = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: language },
            ...(components.length > 0 && { components })
          }
        };
        
        const response = await axios.post(
          `${apiUrl}/${phoneNumberId}/messages`,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
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
            phoneNumberId,
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