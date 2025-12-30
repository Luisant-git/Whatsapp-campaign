import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class QuickReplyService {
  constructor(private prisma: PrismaService) {}

  async getQuickReply(message: string, userId: number) {
    const lowerMessage = message.toLowerCase().trim();
    
    const quickReply = await this.prisma.quickReply.findFirst({
      where: { 
        userId, 
        isActive: true,
        trigger: lowerMessage
      }
    });
    
    return quickReply;
  }

  async addQuickReply(userId: number, trigger: string, buttons: Array<{title: string, payload: string}>) {
    return this.prisma.quickReply.create({
      data: {
        trigger: trigger.toLowerCase(),
        buttons,
        userId
      }
    });
  }

  async updateQuickReply(id: number, userId: number, trigger: string, buttons: Array<{title: string, payload: string}>, isActive: boolean) {
    return this.prisma.quickReply.update({
      where: { id },
      data: { trigger: trigger.toLowerCase(), buttons, isActive }
    });
  }

  async removeQuickReply(id: number, userId: number): Promise<boolean> {
    try {
      await this.prisma.quickReply.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAllQuickReplies(userId: number) {
    return this.prisma.quickReply.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}