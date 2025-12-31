import { Injectable } from '@nestjs/common';
import { AutoReplyService } from '../auto-reply/auto-reply.service';
import { QuickReplyService } from '../quick-reply/quick-reply.service';

@Injectable()
export class WhatsappSessionService {
  constructor(
    private autoReplyService: AutoReplyService,
    private quickReplyService: QuickReplyService,
  ) {}

  async handleInteractiveMenu(
    from: string,
    text: string,
    userId: number,
    sendCallback: (
      to: string,
      message: string,
      imageUrl?: string,
    ) => Promise<any>,
    sendButtonsCallback: (
      to: string,
      text: string,
      buttons: string[],
    ) => Promise<any>,
  ): Promise<boolean> {
    const lowerText = text.toLowerCase().trim();
    console.log('Processing message:', lowerText);

    // Check if this is a button response (handle nested quick replies)
    const isButtonResponse = await this.isButtonResponse(lowerText, userId);
    if (isButtonResponse) {
      console.log('Button response detected, checking for nested quick reply');

      // Check if this button response has its own quick reply
      let nestedQuickReply = await this.quickReplyService.getQuickReply(
        lowerText,
        userId,
      );
      if (!nestedQuickReply) {
        nestedQuickReply = await this.findSimilarQuickReply(lowerText, userId);
      }

      if (nestedQuickReply) {
        console.log('Found nested quick reply:', nestedQuickReply);
        const buttons = nestedQuickReply.buttons as string[];
        await sendButtonsCallback(from, `Please select an option:`, buttons);
        return true; // Handled
      }

      console.log('No nested quick reply found, button response handled');
      return true; // Mark as handled, don't send to chatbot
    }

    // Check for exact quick reply match first
    let quickReply = await this.quickReplyService.getQuickReply(
      lowerText,
      userId,
    );

    // If no exact match, try fuzzy matching for quick replies
    if (!quickReply) {
      quickReply = await this.findSimilarQuickReply(lowerText, userId);
    }

    console.log('Quick reply found:', quickReply);
    if (quickReply) {
      const buttons = quickReply.buttons as string[];
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
    const quickReplies =
      await this.quickReplyService.getAllQuickReplies(userId);

    for (const quickReply of quickReplies) {
      for (const trigger of quickReply.triggers) {
        const lowerTrigger = trigger.toLowerCase();

        if (message.includes(lowerTrigger) || lowerTrigger.includes(message)) {
          return quickReply;
        }

        const messageWords = message.split(' ');
        const triggerWords = lowerTrigger.split(' ');

        for (const word of messageWords) {
          if (
            word.length > 2 &&
            triggerWords.some((tw) => tw.includes(word) || word.includes(tw))
          ) {
            return quickReply;
          }
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
          if (
            word.length > 2 &&
            triggerWords.some((tw) => tw.includes(word) || word.includes(tw))
          ) {
            return autoReply.response;
          }
        }
      }
    }

    return null;
  }

  private async isButtonResponse(
    message: string,
    userId: number,
  ): Promise<boolean> {
    // Check hardcoded buttons first
    const hardcodedButtons = ['AI Chatbot'];
    if (
      hardcodedButtons.some(
        (button) => button.toLowerCase() === message.toLowerCase(),
      )
    ) {
      return true;
    }

    const quickReplies =
      await this.quickReplyService.getAllQuickReplies(userId);

    for (const quickReply of quickReplies) {
      const buttons = quickReply.buttons as string[];
      const isButton = buttons.some(
        (button) => button.toLowerCase() === message.toLowerCase(),
      );
      if (isButton) {
        return true;
      }
    }

    return false;
  }
}
