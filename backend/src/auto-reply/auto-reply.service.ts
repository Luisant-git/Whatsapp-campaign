import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AutoReplyService {
  constructor(private prisma: PrismaService) {}

  async getAutoReply(message: string, userId: number): Promise<string | null> {
    const lowerMessage = message.toLowerCase().trim();

    const autoReplies = await this.prisma.autoReply.findMany({
      where: { userId, isActive: true },
    });

    for (const autoReply of autoReplies) {
      const matchedTrigger = autoReply.triggers.find((trigger) =>
        lowerMessage.includes(trigger.toLowerCase()),
      );

      if (matchedTrigger) {
        return autoReply.response;
      }
    }

    return null;
  }

  async addAutoReply(userId: number, triggers: string[], response: string) {
    return this.prisma.autoReply.create({
      data: {
        triggers,
        response,
        userId,
      },
    });
  }

  async updateAutoReply(
    id: number,
    userId: number,
    triggers: string[],
    response: string,
    isActive: boolean,
  ) {
    return this.prisma.autoReply.update({
      where: { id },
      data: { triggers, response, isActive },
    });
  }

  async removeAutoReply(id: number, userId: number): Promise<boolean> {
    try {
      await this.prisma.autoReply.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAllAutoReplies(userId: number) {
    return this.prisma.autoReply.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
