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
        // Check if chatbot is enabled in Menu Permissions
        const isChatbotEnabled = await this.checkChatbotPermission(tenantId);
        if (isChatbotEnabled) {
          return { route: 'ai-bot', phoneNumberId, settingsId };
        } else {
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
      if (!tenantId) return false;

      // Check Menu Permissions
      const menuPermission = await this.centralPrisma.menuPermission.findUnique({
        where: { tenantId },
      });

      // If no menu permissions set, allow chatbot (default behavior)
      if (!menuPermission || !menuPermission.permission) {
        return true;
      }

      // Check if chatbot is explicitly enabled
      return menuPermission.permission['chatbot'] === true;
    } catch (error) {
      this.logger.error('Error checking chatbot permission:', error);
      return false; // Default to disabled on error
    }
  }
}
