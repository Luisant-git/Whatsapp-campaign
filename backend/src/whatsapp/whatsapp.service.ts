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

const globalGrievanceSessions = new Map<string, { step: string; type: string; location?: string; description?: string; photos: string[]; timestamp: number }>();

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private phoneNumberIdCache = new Map<string, { tenantId: number; settingsId: number; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1 hour
  private phoneCredentialsCache = new Map<string, { phoneNumberId: string; accessToken: string; apiUrl: string; expiresAt: number }>();
  private readonly CREDENTIALS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
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
    const cacheKey = `${featureType}:${userId}`;
    const cached = this.phoneCredentialsCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return cached;

    const featureAssignment = await this.prisma.featureAssignment.findFirst();
    const assignedPhoneId = featureAssignment?.[featureType];

    this.logger.log(`🔍 Getting credentials for ${featureType}, assigned phoneId: ${assignedPhoneId}`);

    let result: { phoneNumberId: string; accessToken: string; apiUrl: string } | null = null;

    if (assignedPhoneId) {
      const masterConfig = await this.prisma.masterConfig.findFirst({
        where: { phoneNumberId: assignedPhoneId, isActive: true }
      });
      if (masterConfig) {
        result = { phoneNumberId: masterConfig.phoneNumberId, accessToken: masterConfig.accessToken, apiUrl: 'https://graph.facebook.com/v18.0' };
      }
    }

    if (!result) {
      const masterConfig = await this.prisma.masterConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });
      if (masterConfig) {
        result = { phoneNumberId: masterConfig.phoneNumberId, accessToken: masterConfig.accessToken, apiUrl: 'https://graph.facebook.com/v18.0' };
      }
    }

    if (!result) {
      const settings = await this.getSettings(userId);
      result = { phoneNumberId: settings.phoneNumberId, accessToken: settings.accessToken, apiUrl: settings.apiUrl };
    }

    this.phoneCredentialsCache.set(cacheKey, { ...result, expiresAt: Date.now() + this.CREDENTIALS_CACHE_TTL });
    return result;
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
      text = listTitle || listId; // Use the list title as the message text
      this.logger.log(`List item selected: ${listTitle} (ID: ${listId})`);
    }

    // Handle reactions, stickers, and other non-text interactions
    if (message.type === 'reaction' && message.reaction?.emoji) {
      text = `Reaction: ${message.reaction.emoji}`;
    } else if (message.type === 'sticker') {
      text = `[Sticker sent]`;
    } else if (message.type === 'location') {
      text = `[Location shared: ${message.location?.latitude || ''}, ${message.location?.longitude || ''}]`;
    } else if (message.type === 'contacts') {
      text = `[Contact shared: ${message.contacts?.[0]?.name?.formatted_name || 'unknown'}]`;
    } else if (message.type === 'unsupported' || message.type === 'unknown') {
      text = `[Unsupported message type sent by user]`;
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
      console.log(`\n🔍 SEARCHING FOR USERS WITH phone_number_id: ${phoneNumberId}`);
      const userIds: number[] = [];
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true }
      });
      console.log(`→ Found ${tenants.length} active tenants to search`);

      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

        // Check WhatsApp Settings
        const settings = await tenantClient.whatsAppSettings.findMany({
          where: { phoneNumberId },
          select: { id: true, name: true, phoneNumberId: true }
        });

        if (settings.length > 0) {
          console.log(`  ✅ Tenant ${tenant.id}: Found ${settings.length} WhatsApp Settings`);
          settings.forEach(s => {
            console.log(`     - Settings ID: ${s.id}, Name: ${s.name}, PhoneID: ${s.phoneNumberId}`);
          });
          userIds.push(...settings.map(s => s.id));
        }

        // ✅ ALSO CHECK MASTER CONFIG
        const masterConfigs = await tenantClient.masterConfig.findMany({
          where: { phoneNumberId },
          select: { id: true, name: true, phoneNumberId: true }
        });

        // If master config found, add tenant ID
        if (masterConfigs.length > 0) {
          console.log(`  ✅ Tenant ${tenant.id}: Found ${masterConfigs.length} Master Configs`);
          masterConfigs.forEach(mc => {
            console.log(`     - MasterConfig: ${mc.name}, PhoneID: ${mc.phoneNumberId}`);
          });
          userIds.push(tenant.id);
        }

        if (settings.length === 0 && masterConfigs.length === 0) {
          console.log(`  ❌ Tenant ${tenant.id}: No matching phone_number_id`);
        }
      }
      
      console.log(`\n📊 TOTAL USERS FOUND: ${userIds.length}`);
      console.log(`User IDs: ${userIds.join(', ') || 'NONE'}`);
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
      console.log(`\n🔍 VALIDATING VERIFY TOKEN: ${token}`);
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true }
      });
      console.log(`→ Checking ${tenants.length} active tenants`);

      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

        // Check WhatsApp Settings
        const settings = await tenantClient.whatsAppSettings.findFirst({
          where: { verifyToken: token },
          select: { id: true, name: true, phoneNumberId: true }
        });

        if (settings) {
          console.log(`✅ Token found in WhatsAppSettings`);
          console.log(`   Tenant: ${tenant.id}`);
          console.log(`   Settings: ${settings.name}`);
          console.log(`   PhoneNumberId: ${settings.phoneNumberId}`);
          return true;
        }

        // ✅ ALSO CHECK MASTER CONFIG
        const masterConfig = await tenantClient.masterConfig.findFirst({
          where: { verifyToken: token, isActive: true },
          select: { id: true, name: true, phoneNumberId: true }
        });

        if (masterConfig) {
          console.log(`✅ Token found in MasterConfig`);
          console.log(`   Tenant: ${tenant.id}`);
          console.log(`   MasterConfig: ${masterConfig.name}`);
          console.log(`   PhoneNumberId: ${masterConfig.phoneNumberId}`);
          return true;
        }
      }
      console.log(`❌ Token NOT FOUND in any tenant database`);
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
  
    // CASE 2: no phone => return paginated unique chats using DB-level DISTINCT
    const whereClause = allowedPhones ? `AND "from" = ANY($3)` : '';
    const params: any[] = [(page - 1) * limit, limit];
    if (allowedPhones) params.push(allowedPhones);

    const [uniqueChats, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT DISTINCT ON ("from", "phoneNumberId") 
            id, "from", "phoneNumberId", message, "mediaType", "mediaUrl", direction, status, "profileName", "createdAt", "updatedAt",
            (SELECT MAX("createdAt") FROM "WhatsAppMessage" i WHERE i."from" = "WhatsAppMessage"."from" AND i."phoneNumberId" = "WhatsAppMessage"."phoneNumberId" AND i.direction = 'incoming') as "lastIncomingDate"
         FROM "WhatsAppMessage"
         ${allowedPhones ? 'WHERE "from" = ANY($3)' : ''}
         ORDER BY "from", "phoneNumberId", "createdAt" DESC
         LIMIT $2 OFFSET $1`,
        ...params
      ),
      this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) FROM (SELECT DISTINCT "from", "phoneNumberId" FROM "WhatsAppMessage" ${allowedPhones ? 'WHERE "from" = ANY($1)' : ''}) t`,
        ...(allowedPhones ? [allowedPhones] : [])
      ),
    ]);

    const total = Number(countResult[0]?.count || 0);
  
    const uniquePhoneNumberIds = [
      ...new Set(uniqueChats.map((m) => m.phoneNumberId).filter(Boolean)),
    ] as string[];
  
    const uniquePhones = [
      ...new Set(
        uniqueChats.map((m) => this.formatPhoneNumber(m.from)).filter(Boolean),
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
  
    const enrichedChats = uniqueChats.map((msg) => {
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
        lastIncomingDate: msg.lastIncomingDate || null,
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
  async handleIncomingMessageWithoutContext(
    message: any, 
    phoneNumberId: string, 
    profileName?: string | null,
    userId?: string,
    parentUserId?: string,
    username?: string
  ) {
    try {
      this.logger.log(`📨 Webhook received - Phone: ${message.from}, Type: ${message.type}, Text: ${message.text?.body || 'N/A'}`);

      // Check cache first
      const cached = this.phoneNumberIdCache.get(phoneNumberId);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        this.logger.log(`Using cached tenant ${cached.tenantId} for phoneNumberId ${phoneNumberId}`);
        await this.processMessageForTenant(message, phoneNumberId, cached.tenantId, cached.settingsId, profileName, userId, parentUserId, username);
        return;
      }

      let tenantId: number | null = null;

      // Cache miss - lookup from central database mapping
      const mapping = await this.centralPrisma.phoneNumberMapping.findUnique({
        where: { phoneNumberId }
      });

      if (mapping) {
        tenantId = mapping.tenantId;
      } else {
        this.logger.warn(`No central mapping found for ${phoneNumberId}. Searching tenant databases...`);
        // Fallback: search all tenants manually
        const userIds = await this.findAllUsersByPhoneNumberId(phoneNumberId);
        if (userIds.length > 0) {
          tenantId = userIds[0];
        }
      }

      if (!tenantId) {
        this.logger.warn(`Could not find any tenant for phoneNumberId: ${phoneNumberId}`);
        return;
      }

      const dbUrl = await this.getTenantDbUrl(tenantId);
      const tenantClient = this.tenantPrisma.getTenantClient(tenantId.toString(), dbUrl);

      const settings = await tenantClient.whatsAppSettings.findFirst({
        where: { phoneNumberId },
        select: { id: true }
      });

      const settingsId = settings?.id || tenantId;

      // Cache the mapping
      this.phoneNumberIdCache.set(phoneNumberId, {
        tenantId,
        settingsId,
        timestamp: Date.now()
      });

      await this.processMessageForTenant(message, phoneNumberId, tenantId, settingsId, profileName, userId, parentUserId, username);
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

  private async processMessageForTenant(
    message: any, 
    phoneNumberId: string, 
    tenantId: number, 
    settingsId: number, 
    profileName?: string | null,
    userId?: string,
    parentUserId?: string,
    username?: string
  ) {
    const dbUrl = await this.getTenantDbUrl(tenantId);
    const tenantClient = this.tenantPrisma.getTenantClient(tenantId.toString(), dbUrl);

    const from = message.from;
    const messageId = message.id;
    let text = message.text?.body;
    let buttonClicked: string | null = null;

    // 🔥 CRITICAL: Handle button clicks from templates FIRST (before any other processing)
    if (message.type === 'button' && message.button) {
      const buttonPayload = message.button.payload;
      const buttonText = message.button.text;
      text = buttonText || buttonPayload; // Use button text or payload
      buttonClicked = `🔘 Button: ${buttonText}`;
      this.logger.log(`🔘 Template button clicked: ${buttonText} (Payload: ${buttonPayload})`);
    }

    // Handle interactive button clicks
    if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
      const buttonTitle = message.interactive.button_reply.title;
      text = buttonTitle;
      buttonClicked = `🔘 Button: ${buttonTitle}`;
      this.logger.log(`🔘 Interactive button clicked: ${buttonTitle}`);
    }

    // Handle interactive list replies
    if (message.type === 'interactive' && message.interactive?.type === 'list_reply') {
      const listId = message.interactive.list_reply.id;
      const listTitle = message.interactive.list_reply.title;
      text = listId || listTitle; // prioritize ID over title since title is truncated
      buttonClicked = `📋 List: ${text}`;
      this.logger.log(`📋 List item selected: ${text}`);
    }

    // Handle reactions, stickers, and other non-text interactions
    if (message.type === 'reaction' && message.reaction?.emoji) {
      text = `Reaction: ${message.reaction.emoji}`;
    } else if (message.type === 'sticker') {
      text = `[Sticker sent]`;
    } else if (message.type === 'location') {
      text = `[Location shared: ${message.location?.latitude || ''}, ${message.location?.longitude || ''}]`;
    } else if (message.type === 'contacts') {
      text = `[Contact shared: ${message.contacts?.[0]?.name?.formatted_name || 'unknown'}]`;
    } else if (message.type === 'unsupported' || message.type === 'unknown') {
      text = `[Unsupported message type sent by user]`;
    }

    const image = message.image;
    const video = message.video;
    const document = message.document;
    const audio = message.audio;

    let mediaType: string | null = null;
    let mediaUrl: string | null = null;

    this.logger.log(`📨 Webhook received - Phone: ${from}, Type: ${message.type}, Text: ${text || 'N/A'}`);
    this.logger.log(`Incoming media debug: image=${!!image}, video=${!!video}, document=${!!document}, audio=${!!audio}`);

    // Check both WhatsAppSettings and MasterConfig
    let whatsappSettings: any = await tenantClient.whatsAppSettings.findFirst({
      where: { phoneNumberId }
    });

    // If not found in settings, check MasterConfig
    if (!whatsappSettings) {
      const masterConfig = await tenantClient.masterConfig.findFirst({
        where: { phoneNumberId, isActive: true }
      });

      if (masterConfig) {
        this.logger.log(`Using MasterConfig: ${masterConfig.name}`);
        // Create a settings-like object from masterConfig
        whatsappSettings = {
          phoneNumberId: masterConfig.phoneNumberId,
          accessToken: masterConfig.accessToken,
          apiUrl: 'https://graph.facebook.com/v18.0',
          language: 'en'
        };
      } else {
        this.logger.warn(`No WhatsApp settings or MasterConfig found for phoneNumberId: ${phoneNumberId}`);
        return;
      }
    }

    // At this point, whatsappSettings is guaranteed to be non-null
    const { accessToken, phoneNumberId: phoneId } = whatsappSettings;

    const apiUrl = process.env.WHATSAPP_API_URL;

    if (!apiUrl) {
      throw new Error('WHATSAPP_API_URL is missing in env');
    }

    if (image) {
      mediaType = 'image';
      mediaUrl = await this.downloadMediaDirect(
        image.id,
        accessToken,
        apiUrl
      );
    } else if (video) {
      mediaType = 'video';
      mediaUrl = await this.downloadMediaDirect(
        video.id,
        accessToken,
        apiUrl
      );
    } else if (document) {
      mediaType = 'document';
      mediaUrl = await this.downloadMediaDirect(
        document.id,
        accessToken,
        apiUrl
      );
    } else if (audio) {
      mediaType = 'audio';
      mediaUrl = await this.downloadMediaDirect(
        audio.id,
        accessToken,
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
        await metaCatalogService.handleOrderMessage(from, phoneId, order, tenantId, profileName || undefined);
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
        message: buttonClicked || text || (mediaType ? `${mediaType} file` : 'interaction'),
        mediaType,
        mediaUrl,
        direction: 'incoming',
        status: 'received',
        phoneNumberId,
        profileName: profileName || null,
        userId: userId || null,
        parentUserId: parentUserId || null,
        username: username || null,
      }
    });
    await this.upsertContactFromIncomingMessage(
      tenantClient,
      from,
      phoneNumberId,
      profileName,
      userId,
      parentUserId,
      username
    );
    this.logger.log(`✓ Message stored successfully`);

    // ---------------- GRIEVANCE CHATBOT LOGIC ----------------
    const grievanceTypes = [
      '💧 குடிநீர் குறை',
      '🚧 மின்சாரம் குறை',
      '🛣️ சாலை குறை',
      '❤️ சுகாதார குறை',
      '🏛️ கட்டிட வசதி குறை',
      '🗑️ போக்குவரத்து குறை',
      '📋 மற்றவை'
    ];

    this.logger.log(`[Grievance Debug] Processing text: "${text?.trim()}" from ${from}. Current active sessions: ${globalGrievanceSessions.size}`);

    if (text && grievanceTypes.includes(text.trim())) {
      this.logger.log(`[Grievance Debug] Exact match found! Starting session for ${from}`);
      globalGrievanceSessions.set(from, { step: 'awaiting_location', type: text.trim(), photos: [], timestamp: Date.now() });
      await this.sendMessageDirect(
        from,
        `தேர்ந்தெடுத்த குறை வகை:\n*${text.trim()}*\n\n*இடம்*\nஉங்கள் குறை பதிவு செய்யும் இடம்`,
        accessToken,
        phoneId,
        tenantClient
      );
      return;
    }

    if (globalGrievanceSessions.has(from)) {
      this.logger.log(`[Grievance Debug] Found active session for ${from}`);
      const session = globalGrievanceSessions.get(from)!;
      
      // Expire session if older than 1 hour
      if (Date.now() - session.timestamp > 3600000) {
        globalGrievanceSessions.delete(from);
      } else {
        if (session.step === 'awaiting_location') {
          if (text) {
            session.location = text;
            session.step = 'awaiting_description';
            session.timestamp = Date.now();
            await this.sendMessageDirect(
              from,
              `*குறை விவரம்*\nஉங்கள் குறையை சுருக்கமாக விவரிக்கவும்`,
              accessToken,
              phoneId,
              tenantClient
            );
            return;
          }
        } else if (session.step === 'awaiting_description') {
          if (text) {
            session.description = text;
            session.step = 'awaiting_photos';
            session.timestamp = Date.now();
            await this.sendButtonsMessageDirect(
              from,
              '',
              `*புகைப்படம் சேர்க்கவும் (0/3)*\nகுறை தொடர்பான புகைப்படங்களை சேர்க்கலாம்.\n\n(படங்களை அனுப்பிய பின் கீழே உள்ள பொத்தானை அழுத்தவும்)`,
              ['சமர்ப்பிக்கவும்'],
              accessToken,
              phoneId,
              tenantClient
            );
            return;
          }
        } else if (session.step === 'awaiting_photos') {
          let handled = false;
          if (mediaType === 'image' && mediaUrl) {
            session.photos.push(mediaUrl);
            session.timestamp = Date.now();
            handled = true;
            if (session.photos.length >= 3) {
              try {
                await axios.post('https://complaintsapp.api.luisant.cloud/webhook/whatsapp', {
                  type: session.type,
                  location: session.location || '',
                  description: session.description || '',
                  images: session.photos
                });
                this.logger.log(`[Grievance] Pushed to Public-Complaint--app API`);
              } catch (err) {
                this.logger.error(`[Grievance] API Push failed: ${err.message}`);
              }
              globalGrievanceSessions.delete(from);
              await this.sendMessageDirect(
                from,
                `✅ உங்கள் குறை வெற்றிகரமாக பதிவு செய்யப்பட்டது! நன்றி.`,
                accessToken,
                phoneId,
                tenantClient
              );
              return;
            } else {
              await this.sendButtonsMessageDirect(
                from,
                '',
                `புகைப்படம் சேர்க்கப்பட்டது (${session.photos.length}/3). மேலும் படங்களை அனுப்பலாம் அல்லது கீழே உள்ள பொத்தானை அழுத்தவும்.`,
                ['சமர்ப்பிக்கவும்'],
                accessToken,
                phoneId,
                tenantClient
              );
              return;
            }
          }
          
          if (text && (text.includes('சமர்ப்பி') || text.toLowerCase().includes('submit') || text.toLowerCase().includes('skip'))) {
            try {
              await axios.post('https://complaintsapp.api.luisant.cloud/webhook/whatsapp', {
                type: session.type,
                location: session.location || '',
                description: session.description || '',
                images: session.photos
              });
              this.logger.log(`[Grievance] Pushed to Public-Complaint--app API`);
            } catch (err) {
              this.logger.error(`[Grievance] API Push failed: ${err.message}`);
            }
            globalGrievanceSessions.delete(from);
            await this.sendMessageDirect(
              from,
              `✅ உங்கள் குறை வெற்றிகரமாக பதிவு செய்யப்பட்டது! நன்றி.`,
              accessToken,
              phoneId,
              tenantClient
            );
            return;
          }

          if (!handled) {
            await this.sendButtonsMessageDirect(
              from,
              '',
              `தயவுசெய்து புகைப்படத்தை அனுப்பவும் அல்லது கீழே உள்ள பொத்தானை அழுத்தவும்.`,
              ['சமர்ப்பிக்கவும்'],
              accessToken,
              phoneId,
              tenantClient
            );
            return;
          }
        }
      }
    }
    // ---------------- END GRIEVANCE CHATBOT LOGIC ----------------

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
          accessToken,
          phoneId,
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
          accessToken,
          phoneId
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
      ,

        async (to, title, msg, buttonText, menuItems) => {

          return this.sendListMessageDirect(to, title, msg, buttonText, menuItems,

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
      ,

        async (to, title, msg, buttonText, menuItems) => {

          return this.sendListMessageDirect(to, title, msg, buttonText, menuItems,

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

  private readonly tenantUrlCache = new Map<number, { dbUrl: string; expiresAt: number }>();
  private readonly TENANT_CACHE_TTL = 5 * 60 * 1000;

  private async getTenantDbUrl(tenantId: number): Promise<string> {
    const cached = this.tenantUrlCache.get(tenantId);
    if (cached && Date.now() < cached.expiresAt) return cached.dbUrl;

    const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    this.tenantUrlCache.set(tenantId, { dbUrl, expiresAt: Date.now() + this.TENANT_CACHE_TTL });
    return dbUrl;
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
      const isBSUID = /^[A-Z]{2}\.([A-Z]+\.)?[0-9]+$/.test(to);
      const payload: any = {
        messaging_product: 'whatsapp',
        type: 'text',
        text: { body: message }
      };

      if (isBSUID) {
        payload.recipient = to;
      } else {
        payload.to = to;
      }

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        payload,
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
      const isBSUID = /^[A-Z]{2}\.([A-Z]+\.)?[0-9]+$/.test(to);
      const payload: any = {
        messaging_product: 'whatsapp',
        type: mediaType,
        [mediaType]: { link: mediaUrl, caption }
      };

      if (isBSUID) {
        payload.recipient = to;
      } else {
        payload.to = to;
      }

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        payload,
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

  async sendListMessageDirect(to: string, title: string, text: string, buttonText: string, menuItems: string[], accessToken: string, phoneNumberId: string, tenantClient: any) {
    try {
      const rows = menuItems.slice(0, 10).map((item, index) => ({
        id: item,
        title: item.length > 24 ? item.substring(0, 24) : item
      }));

      const interactive: any = {
        type: 'list',
        body: { text: text || 'Please select an option:' },
        action: {
          button: buttonText.length > 20 ? buttonText.substring(0, 20) : buttonText,
          sections: [
            {
              title: 'Options',
              rows
            }
          ]
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
          message: `Interactive list: ${title} - ${text}`,
          direction: 'outgoing',
          status: 'sent',
          phoneNumberId,
        }
      });

      return { success: true, messageId: response.data.messages[0].id };
    } catch (error) {
      this.logger.error('WhatsApp List API Error:', error.response?.data || error.message);
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
    const { phoneNumberId, accessToken, apiUrl } = await this.getPhoneCredentials('campaigns', userId);
    const language = 'en';

    // Fetch template ONCE before the loop (was queried 3x per contact)
    const dbTemplate = await this.prisma.messageTemplate.findFirst({
      where: { OR: [{ name: templateName }, { name: { startsWith: templateName + '_v' } }] },
      orderBy: { updatedAt: 'desc' },
    });
    const actualTemplateName = dbTemplate?.name || templateName;
    const templateComponents = dbTemplate?.components
      ? (typeof dbTemplate.components === 'string' ? JSON.parse(dbTemplate.components as string) : dbTemplate.components as any[])
      : [];
    const headerComponent = templateComponents.find((c: any) => c.type === 'HEADER');
    const bodyComponent = templateComponents.find((c: any) => c.type === 'BODY');
    const templateBodyVariables: string[] = bodyComponent?.text?.match(/{{\d+}}/g) || [];

    // Fetch all contact data in one query before the loop
    const allFormattedPhones = contacts.map(c => this.formatPhoneNumber(c.phone));
    const allContactData = await this.prisma.contact.findMany({
      where: { phone: { in: allFormattedPhones } },
    });
    const contactDataMap = new Map(allContactData.map(c => [c.phone, c]));

    const results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }> = [];
    const messagesToCreate: any[] = [];

    for (const contact of contacts) {
      const validationError = this.validatePhoneNumber(contact.phone);
      if (validationError) {
        results.push({ phoneNumber: contact.phone, success: false, error: validationError });
        continue;
      }

      const formattedPhone = this.formatPhoneNumber(contact.phone);

      try {
        this.logger.log(`Sending campaign message to ${formattedPhone} with template ${templateName}`);

        const components: any[] = [];

        // Use pre-fetched template + contact data — zero DB queries inside loop
        if (headerImageUrl && headerImageUrl.trim() !== '' && headerImageUrl.startsWith('http')) {
          let headerFormat = headerComponent?.format || 'IMAGE';
          if (!headerComponent) {
            const isVideo = /\.(mp4|avi|mov)$/i.test(headerImageUrl);
            const isDocument = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(headerImageUrl);
            headerFormat = isDocument ? 'DOCUMENT' : isVideo ? 'VIDEO' : 'IMAGE';
          }
          const mediaType = headerFormat.toLowerCase();
          components.push({ type: 'header', parameters: [{ type: mediaType, [mediaType]: { link: headerImageUrl } }] });
        }

        const fullContact = contactDataMap.get(formattedPhone);

        if (templateBodyVariables.length > 0) {
          const varFields = ['name', 'variable2', 'variable3', 'variable4', 'variable5', 'variable6'];
          const bodyParameters = templateBodyVariables.map((_: string, i: number) => {
            const field = varFields[i];
            const value = i === 0
              ? (fullContact?.name || contact.name || 'Customer')
              : (fullContact?.[field] || '');
            return { type: 'text', text: value || ' ' };
          });
          components.push({ type: 'body', parameters: bodyParameters });
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
            },
            timeout: 15000 // 15 seconds timeout to prevent hanging
          }
        );

        messagesToCreate.push({
          messageId: response.data.messages[0].id,
          to: formattedPhone,
          from: formattedPhone,
          message: `Template ${templateName} sent to ${contact.name}`,
          direction: 'outgoing',
          status: 'sent',
          phoneNumberId,
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

    if (messagesToCreate.length > 0) {
      try {
        await this.prisma.whatsAppMessage.createMany({
          data: messagesToCreate,
          skipDuplicates: true
        });
      } catch (err) {
        this.logger.error('Failed to batch create WhatsApp messages', err);
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
    userId?: string,
    parentUserId?: string,
    username?: string
  ) {
    const formattedPhone = this.formatPhoneNumber(phone);

    const normalizedProfileName =
      profileName &&
      !['null', 'undefined', 'unknown'].includes(profileName.trim().toLowerCase()) &&
      profileName.trim() !== formattedPhone
        ? profileName.trim()
        : '';

    const fallbackName = normalizedProfileName || formattedPhone;

    try {
      await prismaClient.contact.upsert({
        where: { phone: formattedPhone },
        update: {
          lastMessageDate: new Date(),
          isActive: true,
          ...(normalizedProfileName && { name: normalizedProfileName }),
          ...(userId && { userId }),
          ...(parentUserId && { parentUserId }),
          ...(username && { username }),
        },
        create: {
          name: fallbackName,
          phone: formattedPhone,
          phoneNumberId: phoneNumberId ?? null,
          groupId: null,
          lastMessageDate: new Date(),
          isActive: true,
          userId: userId || null,
          parentUserId: parentUserId || null,
          username: username || null,
        },
      });
    } catch (err: any) {
      // P2002 = unique constraint — contact already exists, safe to ignore
      if (err?.code !== 'P2002') {
        this.logger.warn(`upsertContact failed for ${formattedPhone}:`, err.message);
      }
    }
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

    if (assignments.length === 0) return [];

    const subUserIds = assignments.map(a => a.subUserId);
    const phones = assignments.map(a => a.phone);

    // 2 queries instead of 2N queries
    const [subUsers, contacts] = await Promise.all([
      this.centralPrisma.subUser.findMany({
        where: { id: { in: subUserIds } },
        select: { id: true, email: true, designation: true },
      }),
      this.prisma.contact.findMany({
        where: { phone: { in: phones } },
        include: { group: true },
      }),
    ]);

    const subUserMap = new Map(subUsers.map(u => [u.id, u]));
    const contactMap = new Map(contacts.map(c => [c.phone, c]));

    return assignments.map(a => {
      const subUser = subUserMap.get(a.subUserId);
      const contact = contactMap.get(a.phone);
      return {
        id: a.id,
        phone: a.phone,
        subUserId: a.subUserId,
        subUserEmail: subUser?.email || '',
        subUserName: subUser?.designation || '',
        contactName: contact?.name || '',
        groupName: contact?.group?.name || '',
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    });
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
