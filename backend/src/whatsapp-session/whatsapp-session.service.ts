import { Injectable } from '@nestjs/common';
import { AutoReplyService } from '../auto-reply.service';

@Injectable()
export class WhatsappSessionService {
  constructor(private autoReplyService: AutoReplyService) {}

  async handleInteractiveMenu(
    from: string, 
    text: string, 
    userId: number,
    sendCallback: (to: string, message: string, imageUrl?: string) => Promise<any>
  ) {
    const lowerText = text.toLowerCase().trim();
    
    // Check for dynamic auto-reply
    const autoReply = await this.autoReplyService.getAutoReply(lowerText, userId);
    if (autoReply) {
      return await sendCallback(from, autoReply);
    }
    
    // Default response for unrecognized messages
    const defaultMessage = `Thank you for your message! Contact our support team for assistance.`;
    return await sendCallback(from, defaultMessage);
  }
}