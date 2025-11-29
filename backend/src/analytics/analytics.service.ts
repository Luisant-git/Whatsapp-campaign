import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AnalyticsDto } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(userId: number, settingsName?: string): Promise<AnalyticsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build campaign filter
    let campaignFilter: any = { campaign: { userId } };
    if (settingsName) {
      const settings = await this.prisma.whatsAppSettings.findFirst({
        where: { name: settingsName, userId }
      });
      if (settings) {
        campaignFilter.campaign = { userId, settingsId: settings.id };
      }
    }

    const [
      totalMessages,
      todayMessages,
      successfulDeliveries,
      failedMessages,
      totalContacts,
      messagesByStatus,
      dailyStats
    ] = await Promise.all([
      this.getTotalMessages(campaignFilter),
      this.getTodayMessages(today, campaignFilter),
      this.getSuccessfulDeliveries(campaignFilter),
      this.getFailedMessages(campaignFilter),
      this.getTotalContacts(campaignFilter),
      this.getMessagesByStatus(campaignFilter),
      this.getDailyStats(campaignFilter)
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

  private async getTotalMessages(filter: any = {}): Promise<number> {
    return this.prisma.campaignMessage.count({ where: filter });
  }

  private async getTodayMessages(today: Date, filter: any = {}): Promise<number> {
    return this.prisma.campaignMessage.count({
      where: {
        ...filter,
        createdAt: {
          gte: today
        }
      }
    });
  }

  private async getSuccessfulDeliveries(filter: any = {}): Promise<number> {
    return this.prisma.campaignMessage.count({
      where: {
        ...filter,
        status: {
          in: ['delivered', 'read', 'sent']
        }
      }
    });
  }

  private async getFailedMessages(filter: any = {}): Promise<number> {
    return this.prisma.campaignMessage.count({
      where: {
        ...filter,
        status: 'failed'
      }
    });
  }

  private async getTotalContacts(filter: any = {}): Promise<number> {
    const result = await this.prisma.campaignMessage.findMany({
      where: filter,
      select: { phone: true },
      distinct: ['phone']
    });
    return result.length;
  }

  private async getMessagesByStatus(filter: any = {}) {
    const statusCounts = await this.prisma.campaignMessage.groupBy({
      by: ['status'],
      where: filter,
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

  private async getDailyStats(filter: any = {}) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const messages = await this.prisma.campaignMessage.findMany({
      where: {
        ...filter,
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
        if (message.status === 'delivered' || message.status === 'read' || message.status === 'sent') {
          dayStats.delivered++;
        } else if (message.status === 'failed') {
          dayStats.failed++;
        }
      }
    });

    return Array.from(dailyMap.values());
  }
}