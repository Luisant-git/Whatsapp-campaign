import { Injectable } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { AnalyticsDto } from '../analytics/dto/analytics.dto';
import { AdminTenantAnalyticsDto, ExpiringTenantDto } from './dto/admin-tenant-analytics.dto';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly centralPrisma: CentralPrismaService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  async getOverallAnalytics(): Promise<AnalyticsDto> {
    const tenants = await this.centralPrisma.tenant.findMany({
      where: { isActive: true },
    });

    let totalMessages = 0;
    let successfulDeliveries = 0;
    let failedMessages = 0;
    const contactSet = new Set<string>();

    for (const tenant of tenants) {
      // 🔹 Build tenant DB URL from central record
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;

      const prisma = this.tenantPrisma.getTenantClient(
        tenant.id.toString(),
        dbUrl,
      );

      const messages = await prisma.campaignMessage.findMany({
        select: {
          phone: true,
          status: true,
        },
      });

      totalMessages += messages.length;

      for (const msg of messages) {
        contactSet.add(msg.phone);

        if (['sent', 'delivered', 'read'].includes(msg.status)) {
          successfulDeliveries++;
        }

        if (msg.status === 'failed') {
          failedMessages++;
        }
      }
    }

    const deliveryRate =
      totalMessages === 0
        ? 0
        : Math.round((successfulDeliveries / totalMessages) * 10000) / 100;

    return {
      totalMessages,
      todayMessages: 0,
      successfulDeliveries,
      failedMessages,
      deliveryRate,
      totalContacts: contactSet.size,
      messagesByStatus: {
        sent: successfulDeliveries,
        delivered: successfulDeliveries,
        read: 0,
        failed: failedMessages,
      },
      dailyStats: [],
    };
  }
  // admin-analytics.service.ts
  async getTenantSubscriptionAnalytics(): Promise<AdminTenantAnalyticsDto> {
    const today = new Date();

    // Fetch all tenants (active + inactive)
    const tenants = await this.centralPrisma.tenant.findMany({
      include: { subscription: true },
      orderBy: { subscriptionEndDate: 'asc' },
    });

    // Map tenants to ExpiringTenantDto
    const expiringSoonList: ExpiringTenantDto[] = tenants
      .map((tenant) => {
        const expiryDate = tenant.subscriptionEndDate;
        if (!expiryDate) return null; // skip tenants without subscription

        const daysLeft = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: tenant.id,
          companyName: tenant.companyName ?? 'Unknown Company',
          currentPlan: tenant.subscription?.name ?? 'No Plan',
          expiryDate,
          daysLeft,
          status: !tenant.isActive
            ? 'Inactive'
            : daysLeft <= 5
            ? 'Critical'
            : daysLeft <= 15
            ? 'Expiring Soon'
            : 'Active',
        };
      })
      .filter((tenant): tenant is ExpiringTenantDto => tenant !== null);

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.isActive).length;

    return {
      totalTenants,
      activeTenants,
      expiredTenants: tenants.filter((t) => t.subscriptionEndDate && t.subscriptionEndDate < today).length,
      expiringSoonTenants: expiringSoonList.length,
      expiringSoonList,
    };
  }
}
