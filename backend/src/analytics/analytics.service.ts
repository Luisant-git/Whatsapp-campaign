import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { TenantContext } from '../tenant/tenant.decorator';
import { AnalyticsDto } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private getPrisma(ctx: TenantContext) {
    return this.tenantPrisma.getTenantClient(ctx.tenantId, ctx.dbUrl);
  }

  async getAnalytics(
    tenantContext: TenantContext,
    settingsName?: string,
    templateName?: string,
    datePreset?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AnalyticsDto> {
    const prisma = this.getPrisma(tenantContext);
    
    // Start of Today (local/server)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Compute Date Range from Preset or Custom Dates
    let dateFilter: { gte?: Date; lte?: Date } | null = null;
    const now = new Date();

    if (datePreset === 'today') {
      dateFilter = { gte: todayStart, lte: todayEnd };
    } else if (datePreset === 'yesterday') {
      const yStart = new Date(now);
      yStart.setDate(yStart.getDate() - 1);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(now);
      yEnd.setDate(yEnd.getDate() - 1);
      yEnd.setHours(23, 59, 59, 999);
      dateFilter = { gte: yStart, lte: yEnd };
    } else if (datePreset === 'last_7_days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      dateFilter = { gte: start, lte: todayEnd };
    } else if (datePreset === 'last_30_days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      dateFilter = { gte: start, lte: todayEnd };
    } else if (datePreset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      dateFilter = { gte: start, lte: todayEnd };
    } else if (startDate || endDate) {
      dateFilter = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        dateFilter.gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        dateFilter.lte = e;
      }
    }

    // Base campaign filter (for templates and settings)
    const campaignConditions: any[] = [];

    if (templateName && templateName.trim() !== '') {
      campaignConditions.push({ templateName: templateName.trim() });
    }

    if (settingsName && settingsName.trim() !== '') {
      const settings = await prisma.whatsAppSettings.findFirst({
        where: { name: settingsName.trim() },
      });
      if (!settings) {
        return {
          totalMessages: 0,
          todayMessages: 0,
          successfulDeliveries: 0,
          failedMessages: 0,
          deliveryRate: 0,
          totalContacts: 0,
          totalGroups: 0,
          totalMessageTemplates: 0,
          totalBroadcasts: 0,
          messagesByStatus: { sent: 0, delivered: 0, read: 0, failed: 0 },
          dailyStats: this.getEmptyDailyStats(),
          availableTemplates: [],
          periodMessages: 0,
          selectedPreset: datePreset,
          selectedTemplate: templateName,
        };
      }
      campaignConditions.push({
        OR: [
          { settingsId: settings.id },
          { templateName: settings.templateName },
        ],
      });
    }

    const campaignSubFilter = campaignConditions.length > 0 ? { AND: campaignConditions } : undefined;

    // Filter without date (for overall counts & today's messages)
    const baseFilterWithoutDate: any = {};
    if (campaignSubFilter) {
      baseFilterWithoutDate.campaign = campaignSubFilter;
    }

    // Filter WITH date applied (for period messages, deliveries, rate)
    const activeFilterWithDate: any = { ...baseFilterWithoutDate };
    if (dateFilter) {
      activeFilterWithDate.createdAt = dateFilter;
    }

    // Fetch list of templates for dropdown selection
    const rawTemplates = await prisma.messageTemplate.findMany({
      where: { status: { not: 'ARCHIVED' } },
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    });
    const availableTemplates = rawTemplates.map((t: any) => t.name).filter(Boolean);

    // Run parallel metric queries
    const [
      overallMessages,
      periodMessages,
      todayMessages,
      successfulDeliveries,
      failedMessages,
      totalContacts,
      totalGroups,
      totalMessageTemplates,
      totalBroadcasts,
      messagesByStatus,
      dailyStats,
    ] = await Promise.all([
      this.getTotalMessages(prisma, baseFilterWithoutDate),
      this.getTotalMessages(prisma, activeFilterWithDate),
      this.getTodayMessages(prisma, todayStart, baseFilterWithoutDate),
      this.getSuccessfulDeliveries(prisma, activeFilterWithDate),
      this.getFailedMessages(prisma, activeFilterWithDate),
      this.getTotalContacts(prisma),
      this.getTotalGroups(prisma),
      this.getTotalMessageTemplates(prisma),
      this.getTotalBroadcasts(prisma, settingsName, templateName),
      this.getMessagesByStatus(prisma, activeFilterWithDate),
      this.getDailyStats(prisma, baseFilterWithoutDate),
    ]);

    // Use periodMessages for delivery rate if date filter is active, otherwise overallMessages
    const totalToRate = dateFilter ? periodMessages : overallMessages;
    const deliveryRate = totalToRate > 0 ? (successfulDeliveries / totalToRate) * 100 : 0;

    return {
      totalMessages: overallMessages,
      periodMessages,
      todayMessages,
      successfulDeliveries,
      failedMessages,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      totalContacts,
      totalGroups,
      totalMessageTemplates,
      totalBroadcasts,
      messagesByStatus,
      dailyStats,
      availableTemplates,
      selectedPreset: datePreset || 'all',
      selectedTemplate: templateName || '',
    };
  }

  // ---------------- HELPERS ----------------

  private async getTotalMessages(prisma: any, filter: any = {}): Promise<number> {
    return prisma.campaignMessage.count({ where: filter });
  }

  private async getTodayMessages(
    prisma: any,
    today: Date,
    filter: any = {},
  ): Promise<number> {
    return prisma.campaignMessage.count({
      where: {
        ...filter,
        createdAt: { gte: today },
      },
    });
  }

  private async getSuccessfulDeliveries(prisma: any, filter: any = {}): Promise<number> {
    return prisma.campaignMessage.count({
      where: {
        ...filter,
        status: { in: ['sent', 'delivered', 'read'] },
      },
    });
  }

  private async getFailedMessages(prisma: any, filter: any = {}): Promise<number> {
    return prisma.campaignMessage.count({
      where: { ...filter, status: 'failed' },
    });
  }

  private async getTotalContacts(prisma: any): Promise<number> {
    return prisma.contact.count({
      where: { isActive: true },
    });
  }

  private async getMessagesByStatus(prisma: any, filter: any = {}) {
    const result = await prisma.campaignMessage.groupBy({
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

  private async getDailyStats(prisma: any, filter: any = {}) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const rows = await prisma.campaignMessage.findMany({
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
  private async getTotalGroups(prisma: any): Promise<number> {
    return prisma.group.count();
  }
  
  private async getTotalMessageTemplates(prisma: any): Promise<number> {
    return prisma.messageTemplate.count({
      where: {
        status: {
          not: 'ARCHIVED',
        },
      },
    });
  }
  
  private async getTotalBroadcasts(prisma: any, settingsName?: string, templateName?: string): Promise<number> {
    const whereClause: any = {
      status: { in: ['completed', 'sent', 'running'] },
    };

    if (templateName && templateName.trim() !== '') {
      whereClause.templateName = templateName.trim();
    }

    if (settingsName && settingsName.trim() !== '') {
      const settings = await prisma.whatsAppSettings.findFirst({
        where: { name: settingsName.trim() },
      });

      if (!settings) return 0;

      whereClause.OR = [
        { settingsId: settings.id },
        { templateName: settings.templateName },
      ];
    }

    return prisma.campaign.count({
      where: whereClause,
    });
  }
}
