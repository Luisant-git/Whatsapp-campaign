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
    
    // Check for exact quick reply match first
    let quickReply = await this.quickReplyService.getQuickReply(lowerText, userId);
    
    // If no exact match, try fuzzy matching for quick replies
    if (!quickReply) {
      quickReply = await this.findSimilarQuickReply(lowerText, userId);
    }
    
    console.log('Quick reply found:', quickReply);
    if (quickReply) {
      const buttons = quickReply.buttons as Array<{title: string, payload: string}>;
      await sendButtonsCallback(from, `Please select an option:`, buttons);
      return true; // Handled
    }
    
    // Check for exact auto-reply match
    let autoReply = await this.autoReplyService.getAutoReply(lowerText, userId);
    
    // If no exact match, try fuzzy matching for auto replies
    if (!autoReply) {
      autoReply = await this.findSimilarAutoReply(lowerText, userId);
    }
    
    console.log('Auto reply found:', autoReply);
    if (autoReply) {
      await sendCallback(from, autoReply);
      return true; // Handled
    }
    
    return false; // Not handled, let chatbot try
  }

  private async findSimilarQuickReply(message: string, userId: number) {
    const quickReplies = await this.quickReplyService.getAllQuickReplies(userId);
    
    for (const quickReply of quickReplies) {
      const trigger = quickReply.trigger.toLowerCase();
      
      // Check if message contains the trigger or trigger contains message
      if (message.includes(trigger) || trigger.includes(message)) {
        return quickReply;
      }
      
      // Check for word-based similarity
      const messageWords = message.split(' ');
      const triggerWords = trigger.split(' ');
      
      for (const word of messageWords) {
        if (word.length > 2 && triggerWords.some(tw => tw.includes(word) || word.includes(tw))) {
          return quickReply;
        }
      }
    }
    
    return null;
  }

  private async findSimilarAutoReply(message: string, userId: number) {
    const autoReplies = await this.autoReplyService.getAllAutoReplies(userId);
    
    for (const autoReply of autoReplies) {
      for (const trigger of autoReply.triggers) {
        const lowerTrigger = trigger.toLowerCase();
        
        // Check if message contains the trigger or trigger contains message
        if (message.includes(lowerTrigger) || lowerTrigger.includes(message)) {
          return autoReply.response;
        }
        
        // Check for word-based similarity
        const messageWords = message.split(' ');
        const triggerWords = lowerTrigger.split(' ');
        
        for (const word of messageWords) {
          if (word.length > 2 && triggerWords.some(tw => tw.includes(word) || word.includes(tw))) {
            return autoReply.response;
          }
        }
      }
    }
    
    return null;
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