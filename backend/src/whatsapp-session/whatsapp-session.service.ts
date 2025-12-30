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
    console.log('Processing message:', lowerText);
    
    // Check if this is a button payload (skip auto/quick replies for button responses)
    const isButtonPayload = await this.isButtonPayload(lowerText, userId);
    if (isButtonPayload) {
      console.log('Button payload detected, skipping to chatbot');
      return false; // Let chatbot handle button payloads
    }
    
    // Check for quick reply buttons first
    const quickReply = await this.quickReplyService.getQuickReply(lowerText, userId);
    console.log('Quick reply found:', quickReply);
    if (quickReply) {
      const buttons = quickReply.buttons as Array<{title: string, payload: string}>;
      await sendButtonsCallback(from, `Please select an option:`, buttons);
      return true; // Handled
    }
    
    // Check for auto-reply
    const autoReply = await this.autoReplyService.getAutoReply(lowerText, userId);
    console.log('Auto reply found:', autoReply);
    if (autoReply) {
      await sendCallback(from, autoReply);
      return true; // Handled
    }
    
    return false; // Not handled, let chatbot try
  }

  private async isButtonPayload(message: string, userId: number): Promise<boolean> {
    // Check if this message matches any button payload from quick replies
    const quickReplies = await this.quickReplyService.getAllQuickReplies(userId);
    
    for (const quickReply of quickReplies) {
      const buttons = quickReply.buttons as Array<{title: string, payload: string}>;
      const isPayload = buttons.some(btn => btn.payload.toLowerCase() === message.toLowerCase());
      if (isPayload) {
        return true;
      }
    }
    
    return false;
  }
}