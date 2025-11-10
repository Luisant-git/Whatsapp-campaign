import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AnalyticsDto } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(): Promise<AnalyticsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalMessages,
      todayMessages,
      successfulDeliveries,
      failedMessages,
      totalContacts,
      messagesByStatus,
      dailyStats
    ] = await Promise.all([
      this.getTotalMessages(),
      this.getTodayMessages(today),
      this.getSuccessfulDeliveries(),
      this.getFailedMessages(),
      this.getTotalContacts(),
      this.getMessagesByStatus(),
      this.getDailyStats()
    ]);

    const deliveryRate = totalMessages > 0 ? (successfulDeliveries / totalMessages) * 100 : 0;

    return {
      totalMessages,
      todayMessages,
      successfulDeliveries,
      failedMessages,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      totalContacts,
      messagesByStatus,
      dailyStats
    };
  }

  private async getTotalMessages(): Promise<number> {
    return this.prisma.whatsAppMessage.count();
  }

  private async getTodayMessages(today: Date): Promise<number> {
    return this.prisma.whatsAppMessage.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });
  }

  private async getSuccessfulDeliveries(): Promise<number> {
    return this.prisma.whatsAppMessage.count({
      where: {
        status: {
          in: ['delivered', 'read']
        }
      }
    });
  }

  private async getFailedMessages(): Promise<number> {
    return this.prisma.whatsAppMessage.count({
      where: {
        status: 'failed'
      }
    });
  }

  private async getTotalContacts(): Promise<number> {
    const result = await this.prisma.whatsAppMessage.findMany({
      select: { to: true },
      distinct: ['to']
    });
    return result.length;
  }

  private async getMessagesByStatus() {
    const statusCounts = await this.prisma.whatsAppMessage.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    return {
      sent: statusCounts.find(s => s.status === 'sent')?._count.status || 0,
      delivered: statusCounts.find(s => s.status === 'delivered')?._count.status || 0,
      read: statusCounts.find(s => s.status === 'read')?._count.status || 0,
      failed: statusCounts.find(s => s.status === 'failed')?._count.status || 0
    };
  }

  private async getDailyStats() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const messages = await this.prisma.whatsAppMessage.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      select: {
        createdAt: true,
        status: true
      }
    });

    const dailyMap = new Map();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, { date: dateStr, sent: 0, delivered: 0, failed: 0 });
    }

    messages.forEach(message => {
      const dateStr = message.createdAt.toISOString().split('T')[0];
      const dayStats = dailyMap.get(dateStr);
      if (dayStats) {
        dayStats.sent++;
        if (message.status === 'delivered' || message.status === 'read') {
          dayStats.delivered++;
        } else if (message.status === 'failed') {
          dayStats.failed++;
        }
      }
    });

    return Array.from(dailyMap.values());
  }
}