import { Injectable } from '@nestjs/common';

@Injectable()
export class AutoReplyService {
  private autoReplies = new Map<string, string>();

  constructor() {
    this.initializeDefaultReplies();
  }

  private initializeDefaultReplies() {
    this.autoReplies.set('hello', 'Hi there! How can I help you today?');
    this.autoReplies.set('hi', 'Hello! Welcome to our service.');
    this.autoReplies.set('thanks', 'You\'re welcome! Is there anything else I can help you with?');
  }

  getAutoReply(message: string): string | null {
    const lowerMessage = message.toLowerCase().trim();
    return this.autoReplies.get(lowerMessage) || null;
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