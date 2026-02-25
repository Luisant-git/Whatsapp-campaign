import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PhoneRouterService {
  private readonly logger = new Logger(PhoneRouterService.name);

  async routeMessage(phoneNumberId: string, message: any, settingsId: number, tenantClient?: any) {
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
        return { route: 'ai-bot', phoneNumberId, settingsId };
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
}
