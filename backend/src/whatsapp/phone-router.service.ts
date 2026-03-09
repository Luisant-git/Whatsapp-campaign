import { Injectable, Logger } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class PhoneRouterService {
  private readonly logger = new Logger(PhoneRouterService.name);

  constructor(private centralPrisma: CentralPrismaService) {}

  async routeMessage(phoneNumberId: string, message: any, settingsId: number, tenantClient?: any, tenantId?: number) {
    try {
      if (!tenantClient) {
        return { route: 'default', phoneNumberId, settingsId };
      }

      const assignments = await tenantClient.featureAssignment.findFirst();

      if (!assignments) {
        return { route: 'default', phoneNumberId, settingsId };
      }

      // Check which feature this phone number is assigned to
      if (assignments.campaigns === phoneNumberId) {
        return { route: 'campaigns-only', phoneNumberId, settingsId };
      }
      if (assignments.ecommerce === phoneNumberId) {
        return { route: 'ecommerce', phoneNumberId, settingsId };
      }
      if (assignments.aiChatbot === phoneNumberId) {
        this.logger.log(`📞 Phone ${phoneNumberId} is assigned to AI Chatbot`);
        // Check if chatbot is enabled in Menu Permissions
        const isChatbotEnabled = await this.checkChatbotPermission(tenantId);
        if (isChatbotEnabled) {
          this.logger.log('✅ Chatbot enabled - routing to ai-bot');
          return { route: 'ai-bot', phoneNumberId, settingsId };
        } else {
          this.logger.log('❌ Chatbot disabled - falling back to quick-reply');
          // If chatbot disabled, fall back to quick-reply
          return { route: 'quick-reply', phoneNumberId, settingsId };
        }
      }
      if (assignments.quickReply === phoneNumberId) {
        return { route: 'quick-reply', phoneNumberId, settingsId };
      }
      if (assignments.whatsappChat === phoneNumberId) {
        return { route: 'one-to-one', phoneNumberId, settingsId };
      }

      // Default: allow all features
      return { route: 'default', phoneNumberId, settingsId };
    } catch (error) {
      this.logger.error('Error in routeMessage:', error);
      return { route: 'default', phoneNumberId, settingsId };
    }
  }

  private async checkChatbotPermission(tenantId?: number): Promise<boolean> {
    try {
      if (!tenantId) {
        this.logger.log('❌ No tenantId provided for chatbot permission check');
        return false;
      }

      this.logger.log(`🔍 Checking chatbot permission for tenant ${tenantId}`);

      // Check Menu Permissions
      let menuPermission = await this.centralPrisma.menuPermission.findUnique({
        where: { tenantId },
      });

      // If no menu permissions exist, create default with chatbot enabled
      if (!menuPermission) {
        this.logger.log(`🆕 Creating default menu permissions for tenant ${tenantId}`);
        menuPermission = await this.centralPrisma.menuPermission.create({
          data: {
            tenantId,
            permission: {
              dashboard: true,
              contacts: true,
              campaigns: true,
              chatbot: true,  // Default enabled
              quickReply: true,
              whatsappChat: true
            }
          }
        });
      }

      this.logger.log(`📋 Menu permission record for tenant ${tenantId}:`, JSON.stringify(menuPermission, null, 2));

      // Check if chatbot is explicitly enabled
      const isEnabled = menuPermission.permission['chatbot'] === true;
      this.logger.log(`🤖 Chatbot permission result: ${isEnabled}`);
      return isEnabled;
    } catch (error) {
      this.logger.error('Error checking chatbot permission:', error);
      return false; // Default to disabled on error
    }
  }
}
