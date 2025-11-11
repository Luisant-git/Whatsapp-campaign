import { Injectable } from '@nestjs/common';

@Injectable()
export class AutoReplyService {
  private autoReplies = new Map<string, string>();

  constructor() {
    this.initializeDefaultReplies();
  }

  private initializeDefaultReplies() {
    // No default replies - all managed from frontend
  }

  getAutoReply(message: string): string | null {
    const lowerMessage = message.toLowerCase().trim();
    const reply = this.autoReplies.get(lowerMessage);
    
    if (reply) {
      return reply;
    }
    
    // For hi/hello, show available triggers
    if (lowerMessage === 'hi' || lowerMessage === 'hello') {
      const triggers = this.getAvailableTriggers();
      if (triggers) {
        return `Thank you for your message! Type ${triggers} to see available options.`;
      }
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