import { Injectable } from '@nestjs/common';
import { AutoReplyService } from '../auto-reply.service';
import { QuickReplyService } from '../quick-reply.service';

@Injectable()
export class WhatsappSessionService {
  constructor(
    private autoReplyService: AutoReplyService,
    private quickReplyService: QuickReplyService
  ) {}

  async handleInteractiveMenu(
    from: string, 
    text: string, 
    userId: number,
    sendCallback: (to: string, message: string, imageUrl?: string) => Promise<any>,
    sendButtonsCallback: (to: string, text: string, buttons: Array<{title: string, payload: string}>) => Promise<any>
  ): Promise<boolean> {
    const lowerText = text.toLowerCase().trim();
    
    // Check for quick reply buttons first
    const quickReply = await this.quickReplyService.getQuickReply(lowerText, userId);
    if (quickReply) {
      const buttons = quickReply.buttons as Array<{title: string, payload: string}>;
      await sendButtonsCallback(from, `Please select an option:`, buttons);
      return true; // Handled
    }
    
    // Check for auto-reply
    const autoReply = await this.autoReplyService.getAutoReply(lowerText, userId);
    if (autoReply) {
      await sendCallback(from, autoReply);
      return true; // Handled
    }
    
    return false; // Not handled, let chatbot try
  }
}