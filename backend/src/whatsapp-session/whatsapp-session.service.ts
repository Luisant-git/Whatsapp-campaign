import { Injectable } from '@nestjs/common';
import { AutoReplyService } from '../auto-reply/auto-reply.service';
import { QuickReplyService } from '../quick-reply/quick-reply.service';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class WhatsappSessionService {
  constructor(
    private autoReplyService: AutoReplyService,
    private quickReplyService: QuickReplyService,
    private centralPrisma: CentralPrismaService,
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
      title: string,
      text: string,
      buttons: string[],
    ) => Promise<any>,
    sendListCallback?: (
      to: string,
      title: string,
      text: string,
      buttonText: string,
      menuItems: string[],
    ) => Promise<any>,
  ): Promise<boolean> {
    const lowerText = text.toLowerCase().trim();
    console.log('[SessionService] Processing message:', lowerText, 'for userId:', userId);

    // Get user preference
    const user = await this.centralPrisma.tenant.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true }
    });
    
    if (!user) {
      console.log('[SessionService] User not found for userId:', userId);
      return false;
    }
    
    console.log('[SessionService] Found tenant:', user.id);

    const useQuickReply = true; // Default to true for all tenants
    console.log('User preference - useQuickReply:', useQuickReply);

    // Only process quick replies if user has quick reply enabled
    if (useQuickReply) {
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
          const buttons = nestedQuickReply.buttons as any[];
          
          // If no buttons or empty buttons array, send as simple text message
          if (!buttons || buttons.length === 0) {
            const message = [nestedQuickReply.title, nestedQuickReply.response].filter(Boolean).join('\n\n');
            await sendCallback(from, message);
            return true; // Handled
          }
          
          // Extract button text for WhatsApp (only text, not type/value)
          const buttonTexts = buttons.map(btn => typeof btn === 'string' ? btn : btn.text);
          const title = nestedQuickReply.title || '';
          const response = nestedQuickReply.response || 'Please select an option:';
          await sendButtonsCallback(from, title, response, buttonTexts);
          return true; // Handled
        }

        console.log('No nested quick reply found, passing to next priority (Flow/Meta Catalog/AI)');
        return false; // Not handled, let Flow Triggers or other priorities handle it
      }

      // Check for exact quick reply match first
      console.log('[SessionService] Checking quick reply for:', lowerText, 'userId:', userId);
      let quickReply = await this.quickReplyService.getQuickReply(
        lowerText,
        userId,
      );
      console.log('[SessionService] Exact match result:', quickReply);

      // If no exact match, try fuzzy matching for quick replies
      if (!quickReply) {
        console.log('[SessionService] Trying fuzzy match...');
        quickReply = await this.findSimilarQuickReply(lowerText, userId);
        console.log('[SessionService] Fuzzy match result:', quickReply);
      }

      console.log('[SessionService] Final quick reply found:', quickReply);
      if (quickReply) {
        const buttons = quickReply.buttons as any[];
        const sendSeparately = quickReply.sendSeparately || false;
        
        // Check if it's a menu type (list message)
        const firstBtn = buttons && buttons[0];
        const isMenu = firstBtn && typeof firstBtn === 'object' && firstBtn.type === 'menu';
        
        if (isMenu && sendListCallback) {
          // Send as WhatsApp List Message
          const menuName = firstBtn.text || 'Options';
          const menuItems = firstBtn.menuItems || [];
          const message = quickReply.response || 'Please select an option:';
          
          if (sendSeparately) {
            // Send text first if exists
            if (quickReply.title || quickReply.response) {
              const textMsg = [quickReply.title, quickReply.response].filter(Boolean).join('\n\n');
              await sendCallback(from, textMsg);
            }
            // Then send list separately
            await sendListCallback(from, '', 'Please select an option:', menuName, menuItems);
          } else {
            // Send combined
            await sendListCallback(from, quickReply.title || '', message, menuName, menuItems);
          }
          return true;
        }
        
        // If sendSeparately is true, send text and buttons as separate messages
        if (sendSeparately && buttons && buttons.length > 0) {
          // Send text message first (if exists)
          if (quickReply.title || quickReply.response) {
            const message = [quickReply.title, quickReply.response].filter(Boolean).join('\n\n');
            await sendCallback(from, message);
          }
          
          // Then send buttons as separate message
          const buttonTexts = buttons.map(btn => typeof btn === 'string' ? btn : btn.text);
          await sendButtonsCallback(from, '', 'Please select an option:', buttonTexts);
          return true; // Handled
        }
        
        // If no buttons or empty buttons array, send as simple text message
        if (!buttons || buttons.length === 0) {
          const message = [quickReply.title, quickReply.response].filter(Boolean).join('\n\n');
          await sendCallback(from, message);
          return true; // Handled
        }
        
        // Send combined message (default behavior)
        const buttonTexts = buttons.map(btn => typeof btn === 'string' ? btn : btn.text);
        const title = quickReply.title || '';
        const response = quickReply.response || 'Please select an option:';
        await sendButtonsCallback(from, title, response, buttonTexts);
        return true; // Handled
      }
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
    const quickReplies =
      await this.quickReplyService.getAllQuickReplies(userId);

    for (const quickReply of quickReplies) {
      const buttons = quickReply.buttons as any[];
      const isButton = buttons.some((button) => {
        // Handle both old format (string) and new format (object)
        const buttonText = typeof button === 'string' ? button : button.text;
        return buttonText.toLowerCase() === message.toLowerCase();
      });
      if (isButton) {
        return true;
      }
    }

    return false;
  }
}
