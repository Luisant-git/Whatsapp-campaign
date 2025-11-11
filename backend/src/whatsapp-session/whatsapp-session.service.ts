import { Injectable } from '@nestjs/common';
import { AutoReplyService } from '../auto-reply.service';

@Injectable()
export class WhatsappSessionService {
  constructor(private autoReplyService: AutoReplyService) {}

  async handleInteractiveMenu(
    from: string, 
    text: string, 
    sendCallback: (to: string, message: string, imageUrl?: string) => Promise<any>
  ) {
    const lowerText = text.toLowerCase().trim();
    
    // Check for dynamic auto-reply
    const autoReply = this.autoReplyService.getAutoReply(lowerText);
    if (autoReply) {
      return await sendCallback(from, autoReply);
    }
    
    // Default response for unrecognized messages
    const triggers = this.autoReplyService.getAvailableTriggers();
    const defaultMessage = triggers 
      ? `Thank you for your message! Type ${triggers} to see available options.`
      : `Thank you for your message! Contact our support team for assistance.`;
    return await sendCallback(from, defaultMessage);
  }
}