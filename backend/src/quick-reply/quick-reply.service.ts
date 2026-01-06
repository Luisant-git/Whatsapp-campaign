import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class QuickReplyService {
  constructor(private prisma: PrismaService) {}

  async getQuickReply(message: string, userId: number) {
    const lowerMessage = message.toLowerCase().trim();
    console.log('Looking for quick reply with trigger:', lowerMessage);

    const quickReply = await this.prisma.quickReply.findFirst({
      where: {
        userId,
        isActive: true,
        triggers: {
          hasSome: [lowerMessage],
        },
      },
    });

    console.log('Quick reply result:', quickReply);
    return quickReply;
  }

  async addQuickReply(userId: number, triggers: string[], buttons: string[]) {
    return this.prisma.quickReply.create({
      data: {
        triggers: triggers.map((t) => t.toLowerCase()),
        buttons,
        userId,
      },
    });
  }

  async updateQuickReply(
    id: number,
    userId: number,
    triggers: string[],
    buttons: string[],
    isActive: boolean,
  ) {
    return this.prisma.quickReply.update({
      where: { id },
      data: {
        triggers: triggers.map((t) => t.toLowerCase()),
        buttons,
        isActive,
      },
    });
  }

  async removeQuickReply(id: number, userId: number): Promise<boolean> {
    try {
      await this.prisma.quickReply.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAllQuickReplies(userId: number) {
    return this.prisma.quickReply.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
