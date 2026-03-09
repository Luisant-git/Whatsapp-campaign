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

      // TEMPORARY: Force disable chatbot for tenant 1 for testing
      if (tenantId === 1) {
        this.logger.log('🚫 TEMPORARY: Forcing chatbot disabled for tenant 1');
        return false;
      }

      // Check Menu Permissions
      const menuPermission = await this.centralPrisma.menuPermission.findUnique({
        where: { tenantId },
      });

      this.logger.log(`📋 Raw menu permission record for tenant ${tenantId}:`, JSON.stringify(menuPermission, null, 2));
      this.logger.log(`📋 Permission field value:`, menuPermission?.permission);
      this.logger.log(`📋 Permission field type:`, typeof menuPermission?.permission);

      // If no menu permissions set, allow chatbot (default behavior)
      if (!menuPermission || !menuPermission.permission) {
        this.logger.log('✅ No menu permissions set - allowing chatbot (default)');
        return true;
      }

      // Check if chatbot is explicitly enabled
      const isEnabled = menuPermission.permission['chatbot'] === true;
      this.logger.log(`🤖 Chatbot permission in object:`, menuPermission.permission['chatbot']);
      this.logger.log(`🤖 Chatbot permission result: ${isEnabled}`);
      return isEnabled;
    } catch (error) {
      this.logger.error('Error checking chatbot permission:', error);
      return false; // Default to disabled on error
    }
  }
}
