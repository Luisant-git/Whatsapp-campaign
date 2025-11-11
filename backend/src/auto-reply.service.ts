import { Injectable } from '@nestjs/common';

@Injectable()
export class AutoReplyService {
  private autoReplies = new Map<string, string>();

  constructor() {
    this.initializeDefaultReplies();
  }

  private initializeDefaultReplies() {
    this.autoReplies.set('menu', '🤖 *WhatsApp Bot Menu*\n\nReply with:\n• *info* - Get company information\n• *support* - Contact support\n• *menu* - Show this menu again\n\nHow can I help you today?');
    this.autoReplies.set('help', '🤖 *WhatsApp Bot Menu*\n\nReply with:\n• *info* - Get company information\n• *support* - Contact support\n• *menu* - Show this menu again\n\nHow can I help you today?');
    this.autoReplies.set('info', 'ℹ️ *Company Information*\n\nWe are a leading WhatsApp campaign management platform.\nVisit our website for more details.\n\nType *menu* to see all options.');
    this.autoReplies.set('support', '🆘 *Support Contact*\n\nFor technical support, please contact:\n📧 Email: support@company.com\n📞 Phone: +1-234-567-8900\n\nType *menu* to see all options.');
    this.autoReplies.set('hello', `Thank you for your message! Type ${this.getAvailableTriggers()} to see available options or contact our support team for assistance.`);
    this.autoReplies.set('hi', `Thank you for your message! Type ${this.getAvailableTriggers()} to see available options or contact our support team for assistance.`);
    this.autoReplies.set('thanks', 'You\'re welcome! Is there anything else I can help you with?');
  }

  getAutoReply(message: string): string | null {
    const lowerMessage = message.toLowerCase().trim();
    const reply = this.autoReplies.get(lowerMessage);
    
    if (reply) {
      return reply;
    }
    
    return null;
  }

  getAvailableTriggers(): string {
    const triggers = Array.from(this.autoReplies.keys())
      .filter(t => !['hi', 'hello', 'thanks'].includes(t))
      .map(t => `*${t}*`)
      .join(', ');
    return triggers;
  }

  addAutoReply(trigger: string, response: string): void {
    this.autoReplies.set(trigger.toLowerCase(), response);
  }

  removeAutoReply(trigger: string): boolean {
    return this.autoReplies.delete(trigger.toLowerCase());
  }

  getAllAutoReplies(): Array<{trigger: string, response: string}> {
    return Array.from(this.autoReplies.entries()).map(([trigger, response]) => ({
      trigger,
      response
    }));
  }
}