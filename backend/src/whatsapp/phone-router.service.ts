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

      // Get tenant with subscription info
      const tenant = await this.centralPrisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          subscription: true
        }
      });

      if (!tenant) {
        this.logger.log(`❌ Tenant ${tenantId} not found`);
        return false;
      }

      // Check subscription plan permissions FIRST (Plan Menu Permission)
      if (tenant.subscription?.menuPermissions) {
        this.logger.log(`📋 Subscription plan permissions:`, tenant.subscription.menuPermissions);
        const isEnabled = tenant.subscription.menuPermissions.includes('chatbot');
        this.logger.log(`🤖 Plan permission result: ${isEnabled}`);
        return isEnabled;
      }

      // Default: disabled if no plan permissions found
      this.logger.log(`🤖 No plan permissions found, defaulting to disabled`);
      return false;
    } catch (error) {
      this.logger.error('Error checking chatbot permission:', error);
      return false; // Default to disabled on error
    }
  }
}
