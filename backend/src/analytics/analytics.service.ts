import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AnalyticsDto } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(
    userId: number,
    settingsName?: string,
  ): Promise<AnalyticsDto> {
    // Start of Today (UTC Safe)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Base filter: all campaigns of user
    let campaignFilter: any = {
      campaign: {
        userId,
      },
    };

    // Filter by settingsName (Fixed)
    if (settingsName) {
      const settings = await this.prisma.whatsAppSettings.findFirst({
        where: { name: settingsName, userId },
      });

      // If settings not found: return empty safely
      if (!settings) {
        return {
          totalMessages: 0,
          todayMessages: 0,
          successfulDeliveries: 0,
          failedMessages: 0,
          deliveryRate: 0,
          totalContacts: 0,
          messagesByStatus: {
            sent: 0,
            delivered: 0,
            read: 0,
            failed: 0,
          },
          dailyStats: this.getEmptyDailyStats(),
        };
      }

      // Corrected filter ✅
      campaignFilter.campaign = {
        userId,
        OR: [
          { settingsId: settings.id },
          { templateName: settings.templateName },
        ],
      };
    }

    // Run all queries in parallel
    const [
      totalMessages,
      todayMessages,
      successfulDeliveries,
      failedMessages,
      totalContacts,
      messagesByStatus,
      dailyStats,
    ] = await Promise.all([
      this.getTotalMessages(campaignFilter),
      this.getTodayMessages(today, campaignFilter),
      this.getSuccessfulDeliveries(campaignFilter),
      this.getFailedMessages(campaignFilter),
      this.getTotalContacts(campaignFilter),
      this.getMessagesByStatus(campaignFilter),
      this.getDailyStats(campaignFilter),
    ]);

    const deliveryRate =
      totalMessages > 0 ? (successfulDeliveries / totalMessages) * 100 : 0;

    return {
      totalMessages,
      todayMessages,
      successfulDeliveries,
      failedMessages,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      totalContacts,
      messagesByStatus,
      dailyStats,
    };
  }

  // ---------------- HELPERS ----------------

  private async getTotalMessages(filter: any = {}): Promise<number> {
    return this.prisma.campaignMessage.count({ where: filter });
  }

  private async getTodayMessages(
    today: Date,
    filter: any = {},
  ): Promise<number> {
    return this.prisma.campaignMessage.count({
      where: {
        ...filter,
        createdAt: { gte: today },
      },
    });
  }

  private async getSuccessfulDeliveries(filter: any = {}): Promise<number> {
    return this.prisma.campaignMessage.count({
      where: {
        ...filter,
        status: { in: ['sent', 'delivered', 'read'] },
      },
    });
  }

  private async getFailedMessages(filter: any = {}): Promise<number> {
    return this.prisma.campaignMessage.count({
      where: { ...filter, status: 'failed' },
    });
  }

  private async getTotalContacts(filter: any = {}): Promise<number> {
    const contacts = await this.prisma.campaignMessage.findMany({
      where: filter,
      select: { phone: true },
      distinct: ['phone'],
    });
    return contacts.length;
  }

  private async getMessagesByStatus(filter: any = {}) {
    const result = await this.prisma.campaignMessage.groupBy({
      by: ['status'],
      where: filter,
      _count: { status: true },
    });

    return {
      sent: result.find((r) => r.status === 'sent')?._count.status || 0,
      delivered:
        result.find((r) => r.status === 'delivered')?._count.status || 0,
      read: result.find((r) => r.status === 'read')?._count.status || 0,
      failed: result.find((r) => r.status === 'failed')?._count.status || 0,
    };
  }

  private async getDailyStats(filter: any = {}) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const rows = await this.prisma.campaignMessage.findMany({
      where: {
        ...filter,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    const dailyMap = new Map<string, any>();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, {
        date: dateStr,
        sent: 0,
        delivered: 0,
        failed: 0,
      });
    }

    for (const row of rows) {
      const dateStr = row.createdAt.toISOString().split('T')[0];
      const day = dailyMap.get(dateStr);
      if (day) {
        day.sent++;
        if (['sent', 'delivered', 'read'].includes(row.status)) {
          day.delivered++;
        } else if (row.status === 'failed') {
          day.failed++;
        }
      }
    }

    return Array.from(dailyMap.values());
  }

  private getEmptyDailyStats(): {
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }[] {
    const daily: {
      date: string;
      sent: number;
      delivered: number;
      failed: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daily.push({
        date: d.toISOString().split('T')[0],
        sent: 0,
        delivered: 0,
        failed: 0,
      });
    }

    return daily;
  }
}
