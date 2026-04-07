import { Injectable, Logger } from '@nestjs/common';

export interface BSUIDData {
  userId?: string;
  parentUserId?: string;
  username?: string;
  waId?: string;
}

@Injectable()
export class BsuidService {
  private readonly logger = new Logger(BsuidService.name);

  extractBSUIDFromWebhook(webhookData: any): BSUIDData {
    const contacts = webhookData?.contacts?.[0];
    const message = webhookData?.messages?.[0];

    return {
      userId: contacts?.user_id || message?.from_user_id,
      parentUserId: contacts?.parent_user_id || message?.from_parent_user_id,
      username: contacts?.profile?.username,
      waId: contacts?.wa_id || message?.from
    };
  }

  extractBSUIDFromStatus(statusData: any): BSUIDData {
    const contacts = statusData?.contacts?.[0];
    const status = statusData?.statuses?.[0];

    return {
      userId: contacts?.user_id || status?.recipient_user_id,
      parentUserId: contacts?.parent_user_id || status?.parent_recipient_user_id,
      username: contacts?.profile?.username,
      waId: contacts?.wa_id || status?.recipient_id
    };
  }

  buildMessagePayload(to: string, message: any, useBSUID: boolean = false): any {
    if (useBSUID && this.isBSUID(to)) {
      return {
        messaging_product: 'whatsapp',
        recipient: to,
        ...message
      };
    }

    return {
      messaging_product: 'whatsapp',
      to: to,
      ...message
    };
  }

  isBSUID(identifier: string): boolean {
    return /^[A-Z]{2}\.([A-Z]+\.)?[0-9]+$/.test(identifier);
  }

  isParentBSUID(identifier: string): boolean {
    return /^[A-Z]{2}\.ENT\.[0-9]+$/.test(identifier);
  }

  getIdentifierType(identifier: string): 'phone' | 'bsuid' | 'parent_bsuid' | 'unknown' {
    if (this.isParentBSUID(identifier)) return 'parent_bsuid';
    if (this.isBSUID(identifier)) return 'bsuid';
    if (/^[0-9]{10,15}$/.test(identifier)) return 'phone';
    return 'unknown';
  }

  shouldIncludePhoneNumber(bsuidData: BSUIDData): boolean {
    return !!bsuidData.waId;
  }
}
