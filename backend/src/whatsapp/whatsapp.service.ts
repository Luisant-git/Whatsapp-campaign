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
  ) { }

  private isEcommerceCheckoutStep(step?: string | null): boolean {
    return [
      'confirm_details',
      'awaiting_name',
      'awaiting_address',
      'awaiting_city',
      'awaiting_pincode',
      'awaiting_payment_method',
    ].includes(step || '');
  }
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

    this.logger.log(`🔍 Getting credentials for ${featureType}, assigned phoneId: ${assignedPhoneId}`);

    if (assignedPhoneId) {
      const masterConfig = await this.prisma.masterConfig.findFirst({
        where: { phoneNumberId: assignedPhoneId, isActive: true }
      });
      if (masterConfig) {
        this.logger.log(`✅ Using MasterConfig: ${masterConfig.name} (${masterConfig.phoneNumberId})`);
        return {
          phoneNumberId: masterConfig.phoneNumberId,
          accessToken: masterConfig.accessToken,
          apiUrl: 'https://graph.facebook.com/v18.0'
        };
      } else {
        this.logger.warn(`⚠️ No active MasterConfig found for phoneId: ${assignedPhoneId}`);
      }
    }

    // Fallback to default WhatsApp Settings
    this.logger.log(`📋 Falling back to WhatsApp Settings for userId: ${userId}`);
    const settings = await this.getSettings(userId);
    return {
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
      apiUrl: settings.apiUrl
    };
  }

  private isEcommerceMessage(lowerText: string): boolean {
    return (
      [
        'shop',
        'catalog',
        'products',
        'buy',
        'cod',
        'confirm',
        'update',
        'someone_else',
        'cash on delivery',
        '💵 cash on delivery'
      ].includes(lowerText) ||
      lowerText.startsWith('cat:') ||
      lowerText.startsWith('sub:') ||
      lowerText.startsWith('prod:') ||
      lowerText.startsWith('buy:') ||
      lowerText.startsWith('var:') ||
      lowerText.startsWith('buyvar:')
    );
  }

  async handleIncomingMessage(message: any, userId: number, profileName?: string | null) {
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
        await metaCatalogService.handleOrderMessage(from, settings.phoneNumberId, order, userId, profileName || undefined);
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
        await metaCatalogService.handleOrderMessage(from, settings.phoneNumberId, orderData, userId, profileName || undefined);
      }
      return;
    }

    // Handle interactive button clicks
    if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
      const buttonId = message.interactive.button_reply.id;
      const buttonTitle = message.interactive.button_reply.title;
      text = buttonTitle; // Use button title as the message text
      this.logger.log(`Button clicked: ${buttonTitle} (ID: ${buttonId})`);
    }

    // Handle template button clicks (quick reply buttons from templates)
    if (message.type === 'button' && message.button) {
      const buttonPayload = message.button.payload;
      const buttonText = message.button.text;
      text = buttonText || buttonPayload; // Use button text or payload
      this.logger.log(`Template button clicked: ${buttonText} (Payload: ${buttonPayload})`);
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

      // Only handle stop/yes labels if NOT from a button click
      const isButtonClick = message.type === 'button' || (message.type === 'interactive' && message.interactive?.type === 'button_reply');
      
      if (!isManuallyEdited && !isButtonClick) {
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
        profileName: profileName || null,
      }
    });

    await this.upsertContactFromIncomingMessage(
      this.prisma,
      from,
      settings.phoneNumberId,
      profileName,
    );

    if (text) {
      const lowerText = text.toLowerCase().trim();

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
      if (this.isEcommerceMessage(lowerText)) {
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
        async (to, title, msg, buttons) => {
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

  async downloadMediaDirect(mediaId: string, accessToken: string, apiUrl: string): Promise<string | null> {
    try {
      this.logger.log(`Downloading media directly: ${mediaId}`);

      const mediaInfoResponse = await axios.get(`${apiUrl}/${mediaId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      this.logger.log('Direct media info:', mediaInfoResponse.data);

      const mediaUrl = mediaInfoResponse.data.url;
      if (!mediaUrl) {
        this.logger.error('No media URL found');
        return null;
      }

      const mediaDataResponse = await axios.get(mediaUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        responseType: 'arraybuffer',
      });

      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');

      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const mimeType = mediaInfoResponse.data.mime_type || 'application/octet-stream';
      const ext = mimeType.split('/')[1] || 'bin';
      const filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, mediaDataResponse.data);

      const finalUrl = `${process.env.UPLOAD_URL}/${filename}`;
      this.logger.log(`Media saved: ${finalUrl}`);

      return finalUrl;
    } catch (error) {
      this.logger.error('Direct media download error:', error.response?.data || error.message);
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
  
      await this.prisma.campaignMessage.updateMany({
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

        // Check WhatsApp Settings
        const settings = await tenantClient.whatsAppSettings.findMany({
          where: { phoneNumberId },
          select: { id: true }
        });

        userIds.push(...settings.map(s => s.id));

        // ✅ ALSO CHECK MASTER CONFIG
        const masterConfigs = await tenantClient.masterConfig.findMany({
          where: { phoneNumberId },
          select: { id: true }
        });

        // If master config found, add tenant ID
        if (masterConfigs.length > 0) {
          userIds.push(tenant.id);
        }
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
      this.logger.log(`🔍 Validating verify token: ${token}`);
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true }
      });

      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

        // Check WhatsApp Settings
        const settings = await tenantClient.whatsAppSettings.findFirst({
          where: { verifyToken: token }
        });

        if (settings) {
          this.logger.log(`✅ Token found in WhatsAppSettings for tenant ${tenant.id}`);
          return true;
        }

        // ✅ ALSO CHECK MASTER CONFIG
        const masterConfig = await tenantClient.masterConfig.findFirst({
          where: { verifyToken: token, isActive: true }
        });

        if (masterConfig) {
          this.logger.log(`✅ Token found in MasterConfig: ${masterConfig.name} (${masterConfig.phoneNumberId})`);
          return true;
        }
      }
      this.logger.warn(`❌ Token not found in any tenant database`);
      return false;
    } catch (error) {
      this.logger.error('Error validating verify token:', error);
      return false;
    }
  }

  async findUserByVerifyToken(token: string): Promise<number | null> {
    try {
      this.logger.log(`🔍 Finding user by verify token: ${token}`);
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true }
      });

      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

        // Check WhatsApp Settings
        const settings = await tenantClient.whatsAppSettings.findFirst({
          where: { verifyToken: token },
          select: { id: true }
        });

        if (settings) {
          this.logger.log(`✅ User found in WhatsAppSettings: ${settings.id}`);
          return settings.id;
        }

        // ✅ ALSO CHECK MASTER CONFIG - return tenant ID instead
        const masterConfig = await tenantClient.masterConfig.findFirst({
          where: { verifyToken: token, isActive: true },
          select: { id: true, name: true, phoneNumberId: true }
        });

        if (masterConfig) {
          this.logger.log(`✅ User found via MasterConfig: ${masterConfig.name}, returning tenantId: ${tenant.id}`);
          return tenant.id; // Return tenant ID for master config
        }
      }
      this.logger.warn(`❌ No user found for verify token`);
      return null;
    } catch (error) {
      this.logger.error('Error finding user by verify token:', error);
      return null;
    }
  }

  // async getMessages(userId: number, phoneNumber?: string) {
  //   const messages = await this.prisma.whatsAppMessage.findMany({
  //     where: { ...(phoneNumber && { from: phoneNumber }) },
  //     orderBy: { createdAt: 'asc' },
  //   });

  //   // Enrich messages with display phone number from master config
  //   const enrichedMessages = await Promise.all(
  //     messages.map(async (msg) => {
  //       let displayPhoneNumber: string | null = null;
  //       if (msg.phoneNumberId) {
  //         // First try to find master config
  //         const masterConfig = await this.prisma.masterConfig.findFirst({
  //           where: { phoneNumberId: msg.phoneNumberId },
  //           select: { name: true, phoneNumberId: true }
  //         });

  //         if (masterConfig) {
  //           displayPhoneNumber = `${masterConfig.name} - ${masterConfig.phoneNumberId}`;
  //         } else {
  //           // Fallback to settings name
  //           const settings = await this.prisma.whatsAppSettings.findFirst({
  //             where: { phoneNumberId: msg.phoneNumberId },
  //             select: { name: true, phoneNumberId: true }
  //           });
  //           displayPhoneNumber = settings?.name || msg.phoneNumberId || null;
  //         }
  //       }
  //       return {
  //         ...msg,
  //         displayPhoneNumber,
  //         businessPhoneNumberId: msg.phoneNumberId
  //       };
  //     })
  //   );

  //   return enrichedMessages;
  // }
  async getMessages(
    userId: number,
    phoneNumber?: string,
    userType: 'tenant' | 'subuser' = 'tenant',
    page: number = 1,
    limit: number = 20,
  ) {
    page = Math.max(1, Number(page) || 1);
    limit = Math.max(1, Number(limit) || 20);
  
    let allowedPhones: string[] | undefined;
  
    if (userType === 'subuser') {
      const assignments = await this.prisma.chatAssignment.findMany({
        where: { subUserId: userId },
        select: { phone: true },
      });
  
      allowedPhones = assignments.map((a) => a.phone);
  
      if (allowedPhones.length === 0) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
    }
  
    // -----------------------------
    // CASE 1: selected phone => return all messages for that phone
    // -----------------------------
    if (phoneNumber) {
      const whereCondition =
        allowedPhones
          ? { AND: [{ from: phoneNumber }, { from: { in: allowedPhones } }] }
          : { from: phoneNumber };
  
      const messages = await this.prisma.whatsAppMessage.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'asc' },
      });
  
      const uniquePhoneNumberIds = [
        ...new Set(messages.map((m) => m.phoneNumberId).filter(Boolean)),
      ] as string[];
  
      const uniquePhones = [
        ...new Set(
          messages.map((m) => this.formatPhoneNumber(m.from)).filter(Boolean),
        ),
      ] as string[];
  
      const [masterConfigs, settings, contacts] = await Promise.all([
        this.prisma.masterConfig.findMany({
          where: { phoneNumberId: { in: uniquePhoneNumberIds } },
          select: { name: true, phoneNumberId: true },
        }),
        this.prisma.whatsAppSettings.findMany({
          where: { phoneNumberId: { in: uniquePhoneNumberIds } },
          select: { name: true, phoneNumberId: true },
        }),
        this.prisma.contact.findMany({
          where: { phone: { in: uniquePhones } },
          select: { name: true, phone: true, phoneNumberId: true },
        }),
      ]);
  
      const masterConfigMap = new Map(
        masterConfigs.map((item) => [item.phoneNumberId, item]),
      );
  
      const settingsMap = new Map(
        settings.map((item) => [item.phoneNumberId, item]),
      );
  
      const contactMap = new Map<string, { name: string | null }>();
  
      contacts.forEach((contact) => {
        const keyWithPhoneNumberId = `${contact.phone}_${contact.phoneNumberId || ''}`;
        const keyWithoutPhoneNumberId = `${contact.phone}_`;
  
        if (!contactMap.has(keyWithPhoneNumberId)) {
          contactMap.set(keyWithPhoneNumberId, { name: contact.name });
        }
        if (!contactMap.has(keyWithoutPhoneNumberId)) {
          contactMap.set(keyWithoutPhoneNumberId, { name: contact.name });
        }
      });
  
      const enrichedMessages = messages.map((msg) => {
        let displayPhoneNumber: string | null = null;
  
        if (msg.phoneNumberId) {
          const masterConfig = masterConfigMap.get(msg.phoneNumberId);
          if (masterConfig) {
            displayPhoneNumber = `${masterConfig.name} - ${masterConfig.phoneNumberId}`;
          } else {
            const setting = settingsMap.get(msg.phoneNumberId);
            displayPhoneNumber = setting?.name || msg.phoneNumberId || null;
          }
        }
  
        const normalizedFrom = this.formatPhoneNumber(msg.from);
  
        const contact =
          contactMap.get(`${normalizedFrom}_${msg.phoneNumberId || ''}`) ||
          contactMap.get(`${normalizedFrom}_`);
  
        const contactName = contact?.name || null;
  
        return {
          ...msg,
          displayPhoneNumber,
          businessPhoneNumberId: msg.phoneNumberId,
          contactName,
          profileName: msg.profileName || null,
          customerName: contactName || msg.profileName || msg.from,
        };
      });
  
      return {
        data: enrichedMessages,
        meta: {
          total: enrichedMessages.length,
          page: 1,
          limit: enrichedMessages.length,
          totalPages: 1,
        },
      };
    }
  
    // -----------------------------
    // CASE 2: no phone => return paginated unique numbers/chats
    // -----------------------------
    const whereCondition = allowedPhones
      ? { from: { in: allowedPhones } }
      : {};
  
    const allMessages = await this.prisma.whatsAppMessage.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
    });
  
    const uniqueChatsMap = new Map();
  
    for (const msg of allMessages) {
      const key = `${msg.from}_${msg.phoneNumberId || ''}`;
      if (!uniqueChatsMap.has(key)) {
        uniqueChatsMap.set(key, msg);
      }
    }
  
    const uniqueChats = Array.from(uniqueChatsMap.values());
    const total = uniqueChats.length;
  
    const skip = (page - 1) * limit;
    const paginatedChats = uniqueChats.slice(skip, skip + limit);
  
    const uniquePhoneNumberIds = [
      ...new Set(paginatedChats.map((m) => m.phoneNumberId).filter(Boolean)),
    ] as string[];
  
    const uniquePhones = [
      ...new Set(
        paginatedChats.map((m) => this.formatPhoneNumber(m.from)).filter(Boolean),
      ),
    ] as string[];
  
    const [masterConfigs, settings, contacts] = await Promise.all([
      this.prisma.masterConfig.findMany({
        where: { phoneNumberId: { in: uniquePhoneNumberIds } },
        select: { name: true, phoneNumberId: true },
      }),
      this.prisma.whatsAppSettings.findMany({
        where: { phoneNumberId: { in: uniquePhoneNumberIds } },
        select: { name: true, phoneNumberId: true },
      }),
      this.prisma.contact.findMany({
        where: { phone: { in: uniquePhones } },
        select: { name: true, phone: true, phoneNumberId: true },
      }),
    ]);
  
    const masterConfigMap = new Map(
      masterConfigs.map((item) => [item.phoneNumberId, item]),
    );
  
    const settingsMap = new Map(
      settings.map((item) => [item.phoneNumberId, item]),
    );
  
    const contactMap = new Map<string, { name: string | null }>();
  
    contacts.forEach((contact) => {
      const keyWithPhoneNumberId = `${contact.phone}_${contact.phoneNumberId || ''}`;
      const keyWithoutPhoneNumberId = `${contact.phone}_`;
  
      if (!contactMap.has(keyWithPhoneNumberId)) {
        contactMap.set(keyWithPhoneNumberId, { name: contact.name });
      }
      if (!contactMap.has(keyWithoutPhoneNumberId)) {
        contactMap.set(keyWithoutPhoneNumberId, { name: contact.name });
      }
    });
  
    const enrichedChats = paginatedChats.map((msg) => {
      let displayPhoneNumber: string | null = null;
  
      if (msg.phoneNumberId) {
        const masterConfig = masterConfigMap.get(msg.phoneNumberId);
        if (masterConfig) {
          displayPhoneNumber = `${masterConfig.name} - ${masterConfig.phoneNumberId}`;
        } else {
          const setting = settingsMap.get(msg.phoneNumberId);
          displayPhoneNumber = setting?.name || msg.phoneNumberId || null;
        }
      }
  
      const normalizedFrom = this.formatPhoneNumber(msg.from);
  
      const contact =
        contactMap.get(`${normalizedFrom}_${msg.phoneNumberId || ''}`) ||
        contactMap.get(`${normalizedFrom}_`);
  
      const contactName = contact?.name || null;
  
      return {
        id: msg.id,
        from: msg.from,
        phone: msg.from,
        message: msg.message,
        mediaType: msg.mediaType,
        mediaUrl: msg.mediaUrl,
        direction: msg.direction,
        status: msg.status,
        phoneNumberId: msg.phoneNumberId,
        profileName: msg.profileName || null,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        displayPhoneNumber,
        businessPhoneNumberId: msg.phoneNumberId,
        contactName,
        customerName: contactName || msg.profileName || msg.from,
      };
    });
  
    return {
      data: enrichedChats,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async handleIncomingMessageWithoutContext(message: any, phoneNumberId: string, profileName?: string | null,) {
    try {
      this.logger.log(`📨 Webhook received - Phone: ${message.from}, Type: ${message.type}, Text: ${message.text?.body || 'N/A'}`);

      // Check cache first
      const cached = this.phoneNumberIdCache.get(phoneNumberId);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        this.logger.log(`Using cached tenant ${cached.tenantId} for phoneNumberId ${phoneNumberId}`);
        await this.processMessageForTenant(message, phoneNumberId, cached.tenantId, cached.settingsId, profileName);
        return;
      }

      // Cache miss - find tenant with retry logic
      let tenants;
      let retries = 3;
      while (retries > 0) {
        try {
          tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          this.logger.warn(`Database connection error, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

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

          await this.processMessageForTenant(message, phoneNumberId, tenant.id, settings.id, profileName);
          return;
        }
      }
      this.logger.warn(`No tenant found with phoneNumberId: ${phoneNumberId}`);
    } catch (error) {
      this.logger.error('Error handling incoming message:', error);
    }
  }

  // private async processMessageForTenant(message: any, phoneNumberId: string, tenantId: number, settingsId: number) {
  //   const dbUrl = await this.getTenantDbUrl(tenantId);
  //   const tenantClient = this.tenantPrisma.getTenantClient(tenantId.toString(), dbUrl);

  //   const from = message.from;
  //   const messageId = message.id;
  //   let text = message.text?.body;

  //   // 🔥 ROUTE BASED ON PHONE NUMBER ID
  //   const routing = await this.phoneRouter.routeMessage(phoneNumberId, message, settingsId, tenantClient, tenantId);
  //   this.logger.log(`📍 Routing: ${routing.route} for phone ${phoneNumberId}`);

  //   // Handle Meta Catalog order messages
  //   if (message.type === 'order') {
  //     const order = message.order;
  //     this.logger.log('🛒 Meta Catalog order received:', JSON.stringify(order, null, 2));

  //     const whatsappSettings = await tenantClient.whatsAppSettings.findFirst();
  //     if (whatsappSettings) {
  //       const metaCatalogService = this.ecommerceService['metaCatalogService'];
  //       if (metaCatalogService) {
  //         await metaCatalogService.handleOrderMessage(from, whatsappSettings.phoneNumberId, order, tenantId);
  //         this.logger.log('✅ Order message handled');
  //       }
  //     }
  //     return;
  //   }

  //   if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
  //     text = message.interactive.button_reply.id;
  //   }

  //   if (message.type === 'interactive' && message.interactive?.type === 'list_reply') {
  //     text = message.interactive.list_reply.id;
  //   }

  //   // Quick duplicate check
  //   const existingMessage = await tenantClient.whatsAppMessage.findUnique({ where: { messageId } });
  //   if (existingMessage) {
  //     this.logger.log(`Message ${messageId} already exists, skipping`);
  //     return;
  //   }

  //   // Store message with phoneNumberId
  //   tenantClient.whatsAppMessage.create({
  //     data: {
  //       messageId,
  //       to: from,
  //       from,
  //       message: text || 'media message',
  //       direction: 'incoming',
  //       status: 'received',
  //       phoneNumberId,
  //     }
  //   }).catch(e => this.logger.error('Message store error:', e.message));

  //   this.logger.log(`✓ Message stored successfully`);

  //   // Process immediately
  //   if (text) {
  //     const lowerText = text.toLowerCase().trim();

  //     // Get settings once
  //     const whatsappSettings = await tenantClient.whatsAppSettings.findFirst({
  //       where: { phoneNumberId }
  //     });
  //     if (!whatsappSettings) return;

  //     // 🔥 CAMPAIGNS-ONLY NUMBER: Block incoming messages
  //     if (routing.route === 'campaigns-only') {
  //       this.logger.log('⛔ Campaigns-only number - ignoring incoming message');
  //       return;
  //     }

  //     // Check for flow triggers first
  //     try {
  //       const flowResult = await this.flowTriggerService.checkAndSendFlowWithClient(text, from, tenantClient, whatsappSettings.accessToken, whatsappSettings.phoneNumberId);
  //       if (flowResult?.success) {
  //         this.logger.log(`✅ Flow triggered: ${flowResult.trigger.name}`);
  //         return;
  //       }
  //     } catch (error) {
  //       this.logger.error('Flow trigger error:', error);
  //     }

  //     // 🔥 ECOMMERCE NUMBER: Route to catalog
  //     if (routing.route === 'ecommerce') {
  //       await this.ecommerceService.handleIncomingMessage(from, text, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantId);
  //       return;
  //     }

  //     // Check for ecommerce keywords first (before routing to AI bot)
  //    if (this.isEcommerceMessage(lowerText)) {
  //       await this.ecommerceService.handleIncomingMessage(from, text, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantId);
  //       this.logger.log(`✅ Ecommerce keyword handled`);
  //       return;
  //     }

  //     // 🔥 AI BOT NUMBER: Route to chatbot
  //     if (routing.route === 'ai-bot') {
  //       const chatResponse = await this.chatbotService.processMessage(tenantId, { message: text, phone: from });
  //       if (chatResponse.response) {
  //         await this.sendMessageDirect(from, chatResponse.response, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
  //       }
  //       return;
  //     }

  //     // 🔥 QUICK REPLY NUMBER: Route to session service
  //     if (routing.route === 'quick-reply') {
  //       await this.sessionService.handleInteractiveMenu(from, text, settingsId,
  //         async (to, msg, imageUrl) => {
  //           if (imageUrl) {
  //             return this.sendMediaMessageDirect(to, imageUrl, 'image', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient, msg);
  //           }
  //           return this.sendMessageDirect(to, msg, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
  //         },
  //         async (to, title, msg, buttons) => {
  //           return this.sendButtonsMessageDirect(to, title, msg, buttons, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
  //         }
  //       );
  //       return;
  //     }

  //     // Check if user is in Meta Catalog order flow first
  //     const metaCatalogService = this.ecommerceService['metaCatalogService'];
  //     if (metaCatalogService) {
  //       const handled = await metaCatalogService.handleCustomerResponse(from, whatsappSettings.phoneNumberId, text, tenantId);
  //       if (handled) {
  //         this.logger.log('✅ Meta Catalog order flow handled');
  //         return;
  //       }
  //     }

  //     // Check for ecommerce keywords
  //     if (this.isEcommerceMessage(lowerText))
  //       await this.ecommerceService.handleIncomingMessage(from, text, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantId);
  //       this.logger.log(`✅ Ecommerce keyword handled`);
  //       return;
  //     }

  //     // Check if user is in order flow
  //     const orderResult = await this.ecommerceService.createOrderFromMessage(from, text, tenantId);
  //     if (orderResult === 'awaiting_address') {
  //       await this.sendMessageDirect(from, 'Thank you! Now please provide your complete delivery address:', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
  //       return;
  //     } else if (orderResult === 'awaiting_city') {
  //       await this.sendMessageDirect(from, 'Thank you! Now please provide your city:', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
  //       return;
  //     } else if (orderResult === 'awaiting_pincode') {
  //       await this.sendMessageDirect(from, 'Thank you! Finally, please provide your pincode:', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
  //       return;
  //     } else if (orderResult === true) {
  //       await this.sendMessageDirect(from, '✅ Order placed successfully! We will contact you soon for delivery. Thank you for shopping with us!', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
  //       return;
  //     }

  //     // Try session service for auto-reply/quick-reply
  //     const sessionHandled = await this.sessionService.handleInteractiveMenu(from, text, settingsId,
  //       async (to, msg, imageUrl) => {
  //         if (imageUrl) {
  //           return this.sendMediaMessageDirect(to, imageUrl, 'image', whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient, msg);
  //         }
  //         return this.sendMessageDirect(to, msg, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
  //       },
  //       async (to, title, msg, buttons) => {
  //         return this.sendButtonsMessageDirect(to, title, msg, buttons, whatsappSettings.accessToken, whatsappSettings.phoneNumberId, tenantClient);
  //       }
  //     ).catch(e => { this.logger.error('Session error:', e); return false; });
  //   }
  // }

  private async processMessageForTenant(message: any, phoneNumberId: string, tenantId: number, settingsId: number, profileName?: string | null,) {
    const dbUrl = await this.getTenantDbUrl(tenantId);
    const tenantClient = this.tenantPrisma.getTenantClient(tenantId.toString(), dbUrl);

    const from = message.from;
    const messageId = message.id;
    let text = message.text?.body;

    // 🔥 CRITICAL: Handle button clicks from templates FIRST (before any other processing)
    if (message.type === 'button' && message.button) {
      const buttonPayload = message.button.payload;
      const buttonText = message.button.text;
      text = buttonText || buttonPayload; // Use button text or payload
      this.logger.log(`🔘 Template button clicked: ${buttonText} (Payload: ${buttonPayload})`);
    }

    // Handle interactive button clicks
    if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
      const buttonTitle = message.interactive.button_reply.title;
      text = buttonTitle;
      this.logger.log(`🔘 Interactive button clicked: ${buttonTitle}`);
    }

    // Handle interactive list replies
    if (message.type === 'interactive' && message.interactive?.type === 'list_reply') {
      text = message.interactive.list_reply.id;
      this.logger.log(`📋 List item selected: ${text}`);
    }

    const image = message.image;
    const video = message.video;
    const document = message.document;
    const audio = message.audio;

    let mediaType: string | null = null;
    let mediaUrl: string | null = null;

    this.logger.log(`📨 Webhook received - Phone: ${from}, Type: ${message.type}, Text: ${text || 'N/A'}`);
    this.logger.log(`Incoming media debug: image=${!!image}, video=${!!video}, document=${!!document}, audio=${!!audio}`);

    const whatsappSettings = await tenantClient.whatsAppSettings.findFirst({
      where: { phoneNumberId }
    });

    if (!whatsappSettings) {
      this.logger.warn(`No WhatsApp settings found for phoneNumberId: ${phoneNumberId}`);
      return;
    }

    const apiUrl = process.env.WHATSAPP_API_URL;

    if (!apiUrl) {
      throw new Error('WHATSAPP_API_URL is missing in env');
    }

    if (image) {
      mediaType = 'image';
      mediaUrl = await this.downloadMediaDirect(
        image.id,
        whatsappSettings.accessToken,
        apiUrl
      );
    } else if (video) {
      mediaType = 'video';
      mediaUrl = await this.downloadMediaDirect(
        video.id,
        whatsappSettings.accessToken,
        apiUrl
      );
    } else if (document) {
      mediaType = 'document';
      mediaUrl = await this.downloadMediaDirect(
        document.id,
        whatsappSettings.accessToken,
        apiUrl
      );
    } else if (audio) {
      mediaType = 'audio';
      mediaUrl = await this.downloadMediaDirect(
        audio.id,
        whatsappSettings.accessToken,
        apiUrl
      );
    }

    this.logger.log(`Resolved media => type=${mediaType}, url=${mediaUrl}`);

    const routing = await this.phoneRouter.routeMessage(
      phoneNumberId,
      message,
      settingsId,
      tenantClient,
      tenantId
    );
    this.logger.log(`📍 Routing: ${routing.route} for phone ${phoneNumberId}`);

    if (message.type === 'order') {
      const order = message.order;
      this.logger.log('🛒 Meta Catalog order received:', JSON.stringify(order, null, 2));

      const metaCatalogService = this.ecommerceService['metaCatalogService'];
      if (metaCatalogService) {
        await metaCatalogService.handleOrderMessage(from, whatsappSettings.phoneNumberId, order, tenantId, profileName || undefined);
        this.logger.log('✅ Order message handled');
      }
      return;
    }

    const existingMessage = await tenantClient.whatsAppMessage.findUnique({
      where: { messageId }
    });

    if (existingMessage) {
      this.logger.log(`Message ${messageId} already exists, skipping`);
      return;
    }

    await tenantClient.whatsAppMessage.create({
      data: {
        messageId,
        to: from,
        from,
        message: text || (mediaType ? `${mediaType} file` : 'media message'),
        mediaType,
        mediaUrl,
        direction: 'incoming',
        status: 'received',
        phoneNumberId,
        profileName: profileName || null,
      }
    });
    await this.upsertContactFromIncomingMessage(
      tenantClient,
      from,
      phoneNumberId,
      profileName,
    );
    this.logger.log(`✓ Message stored successfully`);

    if (text) {
      const lowerText = text.toLowerCase().trim();
      
      // Get current step FIRST before any processing
      let currentStep;
      try {
        currentStep = await this.ecommerceService['sessionService'].getStep(from, tenantId);
        this.logger.log(`Current step for ${from}: ${currentStep}`);
      } catch (error) {
        this.logger.error('Error getting step:', error.message);
      }
 
      // PRIORITY 0: Check Meta Catalog responses FIRST (before ecommerce checkout)
      if (currentStep === 'confirm_details' || currentStep === 'awaiting_payment_method') {
        this.logger.log(`[Priority 0] Checking Meta Catalog for step: ${currentStep}, text: ${text}`);
        const metaCatalogService = this.ecommerceService['metaCatalogService'];
        if (metaCatalogService) {
          try {
            const handled = await metaCatalogService.handleCustomerResponse(
              from,
              whatsappSettings.phoneNumberId,
              text,
              tenantId
            );
            if (handled) {
              this.logger.log('✅ [Priority 0] Meta Catalog response handled');
              return;
            }
          } catch (error) {
            this.logger.error('[Priority 0] Meta Catalog error:', error.message);
          }
        }
      }
      
      // Check if user clicked Meta Catalog buttons but session expired
      const isMetaCatalogButton = 
        text === 'Use My Details' || 
        text === 'Update Details' || 
        text === 'Order for Someone' ||
        text === 'Pay Online' ||
        text === 'Cash on Delivery' ||
        lowerText === 'confirm' ||
        lowerText === 'update' ||
        lowerText === 'someone_else' ||
        lowerText === 'payment_razorpay' ||
        lowerText === 'payment_cod';
      
      if (isMetaCatalogButton && !currentStep) {
        this.logger.log('⏱️ Meta Catalog button clicked but no session - sending expired message');
        await this.sendMessageDirect(
          from,
          '⏱️ Session expired. Please send *shop* again to start a new order.',
          whatsappSettings.accessToken,
          whatsappSettings.phoneNumberId,
          tenantClient
        );
        return;
      }
 
      // PRIORITY 1: Ecommerce checkout flow
      if (this.isEcommerceCheckoutStep(currentStep)) {
        this.logger.log(`🛒 Ecommerce checkout step detected: ${currentStep}`);

        const orderResult = await this.ecommerceService.createOrderFromMessage(
          from,
          text,
          tenantId,
          whatsappSettings.accessToken,
          whatsappSettings.phoneNumberId
        );

        if (
          orderResult === 'awaiting_name' ||
          orderResult === 'awaiting_address' ||
          orderResult === 'awaiting_city' ||
          orderResult === 'awaiting_pincode' ||
          orderResult === 'awaiting_payment_method' ||
          orderResult === 'order_placed'
        ) {
          this.logger.log(`✅ Ecommerce checkout handled with result: ${orderResult}`);
          return;
        }
      }

      if (routing.route === 'campaigns-only') {
        this.logger.log('⛔ Campaigns-only number - ignoring incoming message');
        return;
      }
 
      // 🔥 Check if user is in Meta Catalog order flow and wants to exit
      // This is now handled in Priority 0, so we can remove this duplicate check

      // 🔥 PRIORITY 1: Check Quick Replies first
      this.logger.log('🔍 [Priority 1] Checking Quick Replies...');
      const quickReplyHandled = await this.sessionService.handleInteractiveMenu(
        from,
        text,
        tenantId,
        async (to, msg, imageUrl) => {
          if (imageUrl) {
            return this.sendMediaMessageDirect(
              to,
              imageUrl,
              'image',
              whatsappSettings.accessToken,
              whatsappSettings.phoneNumberId,
              tenantClient,
              msg
            );
          }
          return this.sendMessageDirect(
            to,
            msg,
            whatsappSettings.accessToken,
            whatsappSettings.phoneNumberId,
            tenantClient
          );
        },
        async (to, title, msg, buttons) => {
          return this.sendButtonsMessageDirect(to, title, msg, buttons,
            whatsappSettings.accessToken,
            whatsappSettings.phoneNumberId,
            tenantClient
          );
        }
      ).catch(e => {
        this.logger.error('Quick Reply error:', e);
        return false;
      });

      if (quickReplyHandled) {
        this.logger.log('✅ [Priority 1] Quick Reply handled');
        return;
      }

      // 🔥 PRIORITY 2: Check Flow Triggers
      this.logger.log('🔍 [Priority 2] Checking Flow Triggers...');
      try {
        const flowResult = await this.flowTriggerService.checkAndSendFlowWithClient(
          text,
          from,
          tenantClient,
          whatsappSettings.accessToken,
          whatsappSettings.phoneNumberId,
          tenantId
        );

        if (flowResult?.success) {
          this.logger.log(`✅ [Priority 2] Flow triggered: ${flowResult.trigger.name}`);
          return;
        }
      } catch (error) {
        this.logger.error('Flow trigger error:', error);
      }

      // 🔥 PRIORITY 3: Check Meta Catalog (Ecommerce)
      this.logger.log('🔍 [Priority 3] Checking Meta Catalog...');

      // 🔥 ECOMMERCE NUMBER: Route to catalog
      if (routing.route === 'ecommerce') {
        await this.ecommerceService.handleIncomingMessage(
          from,
          text,
          whatsappSettings.accessToken,
          whatsappSettings.phoneNumberId,
          tenantId
        );
        this.logger.log('✅ [Priority 3] Ecommerce route handled');
        return;
      }

      // Check for ecommerce keywords
      if (this.isEcommerceMessage(lowerText)) {
        await this.ecommerceService.handleIncomingMessage(
          from,
          text,
          whatsappSettings.accessToken,
          whatsappSettings.phoneNumberId,
          tenantId
        );
        this.logger.log(`✅ [Priority 3] Ecommerce keyword handled`);
        return;
      }

      // 🔥 PRIORITY 4: AI Chatbot (only if assigned to ai-bot route)
      if (routing.route === 'ai-bot') {
        this.logger.log('🔍 [Priority 4] Routing to AI Chatbot...');
        const chatResponse = await this.chatbotService.processMessage(tenantId, {
          message: text,
          phone: from
        });

        if (chatResponse.response) {
          await this.sendMessageDirect(
            from,
            chatResponse.response,
            whatsappSettings.accessToken,
            whatsappSettings.phoneNumberId,
            tenantClient
          );
          this.logger.log('✅ [Priority 4] AI Chatbot responded');
        }
        return;
      }

      // Quick reply route
      if (routing.route === 'quick-reply') {
        const session = await this.ecommerceService['sessionService'].getSession(from, tenantId);
        const paymentMethod = session?.paymentMethod;

        if (currentStep === 'confirm_details' && paymentMethod === 'COD') {
          const orderResult = await this.ecommerceService.createOrderFromMessage(
            from,
            text,
            tenantId,
            whatsappSettings.accessToken,
            whatsappSettings.phoneNumberId
          );

          if (
            orderResult === 'order_placed' ||
            orderResult === 'awaiting_name' ||
            orderResult === 'awaiting_address' ||
            orderResult === 'awaiting_city' ||
            orderResult === 'awaiting_pincode' ||
            orderResult === 'awaiting_payment_method'
          ) {
            return;
          }
        }

        // IMPORTANT: Meta flow only if NOT in ecommerce checkout
        if (!this.isEcommerceCheckoutStep(currentStep)) {
          const metaCatalogService = this.ecommerceService['metaCatalogService'];
          if (metaCatalogService) {
            const handled = await metaCatalogService.handleCustomerResponse(
              from,
              whatsappSettings.phoneNumberId,
              text,
              tenantId
            );
            if (handled) {
              this.logger.log('✅ Meta Catalog order flow handled in quick-reply');
              return;
            }
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

        await this.sessionService.handleInteractiveMenu(from, text, tenantId, // ✅ Use tenantId
          async (to, msg, imageUrl) => {
            if (imageUrl) {
              return this.sendMediaMessageDirect(
                to,
                imageUrl,
                'image',
                whatsappSettings.accessToken,
                whatsappSettings.phoneNumberId,
                tenantClient,
                msg
              );
            }
            return this.sendMessageDirect(
              to,
              msg,
              whatsappSettings.accessToken,
              whatsappSettings.phoneNumberId,
              tenantClient
            );
          },
          async (to, title, msg, buttons) => {
            return this.sendButtonsMessageDirect(to, title, msg, buttons,
              whatsappSettings.accessToken,
              whatsappSettings.phoneNumberId,
              tenantClient
            );
          }
        );
        return;
      }

      // IMPORTANT: Meta flow only if NOT in ecommerce checkout
      if (!this.isEcommerceCheckoutStep(currentStep)) {
        const metaCatalogService = this.ecommerceService['metaCatalogService'];
        if (metaCatalogService) {
          const handled = await metaCatalogService.handleCustomerResponse(
            from,
            whatsappSettings.phoneNumberId,
            text,
            tenantId
          );

          if (handled) {
            this.logger.log('✅ Meta Catalog order flow handled');
            return;
          }
        }
      }

      const orderResult = await this.ecommerceService.createOrderFromMessage(
        from,
        text,
        tenantId,
        whatsappSettings.accessToken,
        whatsappSettings.phoneNumberId
      );

      if (
        orderResult === 'awaiting_name' ||
        orderResult === 'awaiting_address' ||
        orderResult === 'awaiting_city' ||
        orderResult === 'awaiting_pincode' ||
        orderResult === 'awaiting_payment_method' ||
        orderResult === 'order_placed'
      ) {
        this.logger.log(`✅ Ecommerce order flow handled with result: ${orderResult}`);
        return;
      }

      await this.sessionService.handleInteractiveMenu(
        from,
        text,
        tenantId, // ✅ Use tenantId
        async (to, msg, imageUrl) => {
          if (imageUrl) {
            return this.sendMediaMessageDirect(
              to,
              imageUrl,
              'image',
              whatsappSettings.accessToken,
              whatsappSettings.phoneNumberId,
              tenantClient,
              msg
            );
          }
          return this.sendMessageDirect(
            to,
            msg,
            whatsappSettings.accessToken,
            whatsappSettings.phoneNumberId,
            tenantClient
          );
        },
        async (to, title, msg, buttons) => {
          return this.sendButtonsMessageDirect(to, title, msg, buttons,
            whatsappSettings.accessToken,
            whatsappSettings.phoneNumberId,
            tenantClient
          );
        }
      ).catch(e => {
        this.logger.error('Session error:', e);
        return false;
      });
    }
  }

  private async getTenantDbUrl(tenantId: number): Promise<string> {
    const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');
    return `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
  }

  async updateMessageStatusWithoutContext(messageId: string, status: string, phoneNumberId: string, errorDetails?: any) {
    try {
      const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });

      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

        // Prepare error message from webhook error details
        let errorMessage: string | null = null;
        if (status === 'failed' && errorDetails && errorDetails.length > 0) {
          const error = errorDetails[0];
          const errorCode = error.code;
          const errorTitle = error.title || error.message;
          const errorDetail = error.error_data?.details;
          
          // Build user-friendly error message based on error code
          if (errorCode === 131026) {
            errorMessage = 'Number not registered on WhatsApp or message cannot be delivered';
          } else if (errorCode === 131049) {
            errorMessage = 'Message blocked to maintain healthy engagement (possible spam detection)';
          } else if (errorCode === 131047) {
            errorMessage = 'Invalid phone number format';
          } else if (errorCode === 131051) {
            errorMessage = 'Message type not supported';
          } else if (errorCode === 132000) {
            errorMessage = 'Template does not exist or not approved';
          } else if (errorCode === 132001) {
            errorMessage = 'Template parameters do not match';
          } else if (errorCode === 132005) {
            errorMessage = 'Template is paused or disabled';
          } else if (errorCode === 133000) {
            errorMessage = 'Too many messages sent (rate limit exceeded)';
          } else if (errorCode === 133005) {
            errorMessage = 'Phone number not allowed to receive messages';
          } else if (errorCode === 133006) {
            errorMessage = 'Phone number has blocked your business';
          } else {
            // For unknown error codes, use the original message
            errorMessage = `${errorTitle}`;
            if (errorDetail && errorDetail !== errorTitle) {
              errorMessage += ` - ${errorDetail}`;
            }
          }
          
          this.logger.log(`Webhook error captured: Code ${errorCode} - ${errorMessage}`);
        }

        const updated = await tenantClient.whatsAppMessage.updateMany({
          where: { messageId },
          data: { status }
        });

        // Also update campaign messages with error details
        const campaignUpdateData: any = { status };
        if (errorMessage) {
          campaignUpdateData.error = errorMessage;
        }
        
        await tenantClient.campaignMessage.updateMany({
          where: { messageId },
          data: campaignUpdateData
        });

        if (updated.count > 0) {
          this.logger.log(`Message ${messageId} status updated to ${status}${errorMessage ? ` with error: ${errorMessage}` : ''}`);
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

  async sendButtonsMessageDirect(to: string, title: string, text: string, buttons: any[], accessToken: string, phoneNumberId: string, tenantClient: any) {
    try {
      // Convert all buttons to simple text format
      const buttonTexts = buttons.map(btn => typeof btn === 'string' ? btn : btn.text || btn);
      
      // Create interactive reply buttons (max 3)
      const interactiveButtons = buttonTexts.slice(0, 3).map((buttonText, index) => ({
        type: 'reply',
        reply: {
          id: `btn_${index}`,
          title: buttonText.length > 20 ? buttonText.substring(0, 20) : buttonText
        }
      }));

      const interactive: any = {
        type: 'button',
        body: { text },
        action: {
          buttons: interactiveButtons
        }
      };

      if (title && title.trim()) {
        interactive.header = {
          type: 'text',
          text: title
        };
      }

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive
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
          message: `Interactive buttons: ${title} - ${text}`,
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

  async sendBulkTemplateMessageWithNames(contacts: Array<{ name: string; phone: string }>, templateName: string, userId: number, settingsId?: number, headerImageUrl?: string) {
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

        // ✅ FETCH FULL CONTACT DATA FIRST (before building parameters)
        const fullContact = await this.prisma.contact.findFirst({
          where: { phone: formattedPhone }
        });

        // Add body parameters if the template has variables
        try {
          // First try to find the actual template name from database
          const dbTemplate = await this.prisma.messageTemplate.findFirst({
            where: {
              OR: [
                { name: templateName },
                { name: { startsWith: templateName + '_v' } } // Handle versioned names
              ]
            },
            orderBy: { updatedAt: 'desc' } // Get the most recent version
          });

          const actualTemplateName = dbTemplate?.name || templateName;
          this.logger.log(`Using actual template name: ${actualTemplateName}`);

          if (dbTemplate && dbTemplate.components) {
            const templateComponents = typeof dbTemplate.components === 'string'
              ? JSON.parse(dbTemplate.components)
              : dbTemplate.components;

            const bodyComponent = templateComponents.find((c: any) => c.type === 'BODY');
            if (bodyComponent && bodyComponent.text) {
              // Count variables in body text ({{1}}, {{2}}, etc.)
              const variables = bodyComponent.text.match(/{{\d+}}/g);
              if (variables && variables.length > 0) {
                this.logger.log(`Template ${actualTemplateName} has ${variables.length} body parameters`);

                // Map template variables to contact fields
                // {{1}} → name, {{2}} → variable2, {{3}} → variable3, etc.
                const bodyParameters: Array<{ type: string; text: string }> = [];
                for (let i = 0; i < variables.length; i++) {
                  const varNumber = i + 1;
                  let value = '';

                  if (varNumber === 1) {
                    // {{1}} → Contact Name
                    value = fullContact?.name || contact.name || 'Customer';
                  } else if (varNumber === 2) {
                    // {{2}} → variable2
                    value = fullContact?.variable2 || '';
                  } else if (varNumber === 3) {
                    // {{3}} → variable3
                    value = fullContact?.variable3 || '';
                  } else if (varNumber === 4) {
                    // {{4}} → variable4
                    value = fullContact?.variable4 || '';
                  } else if (varNumber === 5) {
                    // {{5}} → variable5
                    value = fullContact?.variable5 || '';
                  } else if (varNumber === 6) {
                    // {{6}} → variable6
                    value = fullContact?.variable6 || '';
                  } else {
                    // Fallback for any additional variables
                    value = contact.name || 'Customer';
                  }

                  bodyParameters.push({
                    type: 'text',
                    text: value || ' ' // Use space if empty to avoid Meta API errors
                  });

                  this.logger.log(`Variable {{${varNumber}}} mapped to: ${value}`);
                }

                components.push({
                  type: 'body',
                  parameters: bodyParameters
                });
              } else {
                this.logger.log(`Template ${actualTemplateName} has no body parameters`);
              }
            }
          }
        } catch (error) {
          this.logger.warn('Could not determine template body parameters:', error.message);
        }

        // Get the actual template name to use for sending
        let actualTemplateName = templateName;
        try {
          const dbTemplate = await this.prisma.messageTemplate.findFirst({
            where: {
              OR: [
                { name: templateName },
                { name: { startsWith: templateName + '_v' } }
              ]
            },
            orderBy: { updatedAt: 'desc' }
          });

          if (dbTemplate) {
            actualTemplateName = dbTemplate.name;
            this.logger.log(`Using actual template name for sending: ${actualTemplateName}`);
          }
        } catch (error) {
          this.logger.warn('Could not find template in database, using original name:', templateName);
        }

        const requestBody = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: actualTemplateName, // Use the actual template name
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
        
        // CRITICAL DEBUG: Log what we're about to return
        this.logger.error(`=== ERROR CAPTURE DEBUG ===`);
        this.logger.error(`Contact phone: ${contact.phone}`);
        this.logger.error(`Formatted phone: ${formattedPhone}`);
        this.logger.error(`Error message extracted: "${errorMsg}"`);
        this.logger.error(`Error message type: ${typeof errorMsg}`);
        this.logger.error(`Error message length: ${errorMsg?.length}`);
        this.logger.error(`===========================`);
        
        // Log detailed error information
        this.logger.error(`Failed to send to ${contact.phone}:`, {
          error: errorMsg,
          response: error.response?.data,
          status: error.response?.status,
          errorCode: error.response?.data?.error?.code,
          errorSubcode: error.response?.data?.error?.error_subcode,
          fullError: JSON.stringify(error.response?.data)
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
  private async upsertContactFromIncomingMessage(
    prismaClient: any,
    phone: string,
    phoneNumberId?: string | null,
    profileName?: string | null,
  ) {
    const formattedPhone = this.formatPhoneNumber(phone);
  
    const normalizedProfileName =
      profileName &&
      !['null', 'undefined', 'unknown'].includes(profileName.trim().toLowerCase()) &&
      profileName.trim() !== formattedPhone
        ? profileName.trim()
        : '';
  
    const fallbackName = normalizedProfileName || formattedPhone;
  
    const existingContact = await prismaClient.contact.findFirst({
      where: {
        phone: formattedPhone,
        phoneNumberId: phoneNumberId ?? null,
      },
    });
  
    if (existingContact) {
      const existingName =
        existingContact.name &&
        !['null', 'undefined', 'unknown'].includes(existingContact.name.trim().toLowerCase()) &&
        existingContact.name.trim() !== formattedPhone
          ? existingContact.name.trim()
          : '';
  
      await prismaClient.contact.update({
        where: { id: existingContact.id },
        data: {
          name: existingName || fallbackName,
          lastMessageDate: new Date(),
          isActive: true,
        },
      });
  
      return;
    }
  
    await prismaClient.contact.create({
      data: {
        name: fallbackName,
        phone: formattedPhone,
        phoneNumberId: phoneNumberId ?? null,
        groupId: null,
        lastMessageDate: new Date(),
        isActive: true,
      },
    });
  }
  private getErrorMessage(error: any): string {
    // Log the full error for debugging
    this.logger.error('Full error object:', JSON.stringify({
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    }));

    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      
      // Common Meta WhatsApp API error codes
      const errorCodeMap: { [key: number]: string } = {
        100: 'Invalid parameter',
        131026: 'Number not registered on WhatsApp',
        131047: 'Message failed to send - Invalid number',
        131051: 'Unsupported message type',
        132000: 'Template does not exist or not approved',
        132001: 'Template parameter count mismatch',
        132005: 'Template paused or disabled',
        132015: 'Template parameter format invalid',
        132016: 'Template parameter out of range',
        133000: 'Rate limit exceeded',
        133004: 'Message too long',
        133005: 'Phone number not allowed',
        133006: 'Phone number blocked',
        133010: 'Message undeliverable',
        135000: 'Generic user error',
        136000: 'Template name does not exist',
        136001: 'Template language not supported'
      };
      
      if (apiError.code && errorCodeMap[apiError.code]) {
        const baseMessage = errorCodeMap[apiError.code];
        const additionalInfo = apiError.error_user_msg || apiError.error_user_title || apiError.message;
        return additionalInfo ? `${baseMessage}: ${additionalInfo}` : baseMessage;
      }
      
      // If error code not in map, return detailed error
      const errorDetails: string[] = [];
      if (apiError.code) errorDetails.push(`Code ${apiError.code}`);
      if (apiError.error_user_msg) errorDetails.push(apiError.error_user_msg);
      else if (apiError.error_user_title) errorDetails.push(apiError.error_user_title);
      else if (apiError.message) errorDetails.push(apiError.message);
      
      return errorDetails.length > 0 ? errorDetails.join(': ') : 'WhatsApp API error';
    }
    
    // Check for other error formats
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.statusText) {
      return `HTTP ${error.response.status}: ${error.response.statusText}`;
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

  //assign subuser


  async assignChatToSubUser(phone: string, subUserId: number) {
    const formattedPhone = this.formatPhoneNumber(phone);

    return this.prisma.chatAssignment.upsert({
      where: { phone: formattedPhone },
      update: { subUserId },
      create: {
        phone: formattedPhone,
        subUserId,
      },
    });
  }

  async getChatAssignment(phone: string) {
    const formattedPhone = this.formatPhoneNumber(phone);

    return this.prisma.chatAssignment.findUnique({
      where: { phone: formattedPhone },
    });
  }
  async getAllChatAssignments() {
    const assignments = await this.prisma.chatAssignment.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const subUser = await this.centralPrisma.subUser.findUnique({
          where: { id: a.subUserId },
          select: {
            id: true,
            email: true,
            designation: true,
          },
        });

        const contact = await this.prisma.contact.findFirst({
          where: { phone: a.phone },
          include: {
            group: true,
          },
        });

        return {
          id: a.id,
          phone: a.phone,
          subUserId: a.subUserId,
          subUserEmail: subUser?.email || "",
          subUserName: subUser?.designation || "",
          contactName: contact?.name || "",
          groupName: contact?.group?.name || "",
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        };
      })
    );

    return enriched;
  }
  async removeChatAssignment(phone: string) {
    const formattedPhone = this.formatPhoneNumber(phone);

    return this.prisma.chatAssignment.deleteMany({
      where: { phone: formattedPhone },
    });
  }

  async deleteMessages(messageIds: number[]) {
    return this.prisma.whatsAppMessage.deleteMany({
      where: { id: { in: messageIds } },
    });
  }
}
