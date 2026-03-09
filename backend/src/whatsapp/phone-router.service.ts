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

      // Check subscription Menu Permissions (same as frontend uses)
      const tenant = await this.centralPrisma.tenant.findUnique({
        where: { id: tenantId },
        include: { subscription: true }
      });

      if (tenant?.subscription?.menuPermissions) {
        const hasAiChatbot = tenant.subscription.menuPermissions.includes('aiChatbot');
        this.logger.log(`🤖 Subscription includes aiChatbot: ${hasAiChatbot}`);
        return hasAiChatbot;
      }

      // If no subscription or menuPermissions, default to enabled
      this.logger.log('✅ No subscription menu permissions - allowing chatbot (default)');
      return true;
    } catch (error) {
      this.logger.error('Error checking chatbot permission:', error);
      return false;
    }
  }
}
