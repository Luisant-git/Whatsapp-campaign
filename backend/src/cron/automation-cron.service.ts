import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { AutoTemplateSenderService } from './auto-template-sender.service';
import { CampaignService } from '../whatsapp/campaign.service';
import { Prisma, PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import { isWithinAllowedSendingHours } from '../utils/campaign-window.util';

const IST_OFFSET_MIN = 330;

function getIstDayStartUtc(date = new Date()) {
  const istMs = date.getTime() + IST_OFFSET_MIN * 60 * 1000;
  const ist = new Date(istMs);

  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();

  const startUtcMs = Date.UTC(y, m, d, 0, 0, 0) - IST_OFFSET_MIN * 60 * 1000;
  return new Date(startUtcMs);
}

function getIstMonthDay(date = new Date()) {
  const istMs = date.getTime() + IST_OFFSET_MIN * 60 * 1000;
  const ist = new Date(istMs);
  return { month: ist.getUTCMonth() + 1, day: ist.getUTCDate() };
}

@Injectable()
export class AutomationCronService {
  private readonly logger = new Logger(AutomationCronService.name);
  private isRunningRunDailyAutomation = false;
  private isRunningDeleteOldCampaigns = false;
  private isRunningScheduledCampaigns = false;

  constructor(
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService,
    private sender: AutoTemplateSenderService,
    private campaignService: CampaignService,
  ) { }
  // Runs every minute — fires scheduled (one-time date-based) campaigns whose
  // scheduledDate has arrived or passed and haven't been run yet.
  @Cron('* * * * *', { timeZone: 'Asia/Kolkata' })
  async runScheduledDateCampaigns() {
    if (this.isRunningScheduledCampaigns) return;
    if (!isWithinAllowedSendingHours()) return;

    this.isRunningScheduledCampaigns = true;
    try {
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true },
      });

      for (const tenant of tenants) {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

          // Find campaigns due to fire: status=scheduled, scheduleType=scheduled, scheduledDate<=now
          const dueCampaigns = await tenantClient.campaign.findMany({
            where: {
              status: 'scheduled',
              scheduleType: 'scheduled',
              scheduledDate: { lte: new Date() },
            },
            select: { id: true, name: true },
          });

          for (const campaign of dueCampaigns) {
            this.logger.log(`Tenant ${tenant.id}: firing scheduled campaign "${campaign.name}" (id=${campaign.id})`);
            try {
              // Mark as running so we don't double-fire if cron ticks again before completion
              await tenantClient.campaign.update({
                where: { id: campaign.id },
                data: { status: 'running' },
              });
              // runCampaign uses userId=0 for non-user-context runs (same as the existing scheduler)
              await this.campaignService.runCampaignForTenant(campaign.id, tenant.id.toString(), dbUrl);
            } catch (err: any) {
              this.logger.error(`Failed to fire scheduled campaign ${campaign.id} for tenant ${tenant.id}:`, err?.message);
              await tenantClient.campaign.update({
                where: { id: campaign.id },
                data: { status: 'failed' },
              }).catch(() => { });
            }
          }
        } catch (tenantErr: any) {
          this.logger.error(`Error processing scheduled campaigns for tenant ${tenant.id}:`, tenantErr?.message);
        }
      }
    } finally {
      this.isRunningScheduledCampaigns = false;
    }
  }

  //campaign delete cron - every day at midnight IST. TEST: every minute. PROD: '0 0 * * *'
  @Cron(process.env.CAMPAIGN_DELETE_CRON || '0 0 * * *', {
    timeZone: 'Asia/Kolkata',
  })
  async deleteOldCampaigns() {
    if (this.isRunningDeleteOldCampaigns) {
      this.logger.warn('deleteOldCampaigns is already running, skipping...');
      return;
    }

    this.isRunningDeleteOldCampaigns = true;
    this.logger.log('Starting old campaign cleanup job...');

    try {
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true },
      });

      for (const tenant of tenants) {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          const tenantClient = this.tenantPrisma.getTenantClient(
            tenant.id.toString(),
            dbUrl,
          );

          await this.deleteOldCampaignsForTenant(
            tenantClient,
            tenant.id,
            tenant.dbName,
          );
        } catch (error: any) {
          this.logger.error(
            `Failed deleting old campaigns for tenant ${tenant.id} (${tenant.dbName})`,
            error?.message || error,
          );
        }
      }
    } finally {
      this.isRunningDeleteOldCampaigns = false;
    }
  }

  private async deleteOldCampaignsForTenant(
    tenantClient: TenantPrismaClient,
    tenantId: number,
    dbName: string,
  ) {
    try {
      const deleteAfterDays = Number(process.env.CAMPAIGN_DELETE_AFTER_DAYS || 14);
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - deleteAfterDays);

      const deleted = await tenantClient.campaign.deleteMany({
        where: {
          createdAt: {
            lt: oldDate,
          },
          status: {
            in: ['completed', 'failed'],
          },
        },
      });

      if (deleted.count > 0) {
        this.logger.log(
          `Tenant ${tenantId} (${dbName}): deleted ${deleted.count} campaigns older than ${deleteAfterDays} days`,
        );
      } else {
        this.logger.log(
          `Tenant ${tenantId} (${dbName}): no old campaigns to delete`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error deleting old campaigns for tenant ${tenantId} (${dbName})`,
        error?.message || error,
      );
    }
  }

  // TEST: every minute. PROD: '0 9 * * *'
  @Cron(process.env.AUTOMATION_CRON || '* * * * *', {
    timeZone: 'Asia/Kolkata',
  })
  async runDailyAutomation() {
    if (this.isRunningRunDailyAutomation) {
      this.logger.debug('runDailyAutomation is already running, skipping this minute...');
      return;
    }

    // Healthy Meta campaign sending rule: Only send between 8:00 AM and 8:00 PM IST
    if (!isWithinAllowedSendingHours()) {
      this.logger.debug('runDailyAutomation: Outside allowed sending hours (8:00 AM - 8:00 PM IST). Automation messages paused for the night.');
      return;
    }

    this.isRunningRunDailyAutomation = true;
    try {
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true },
      });

      for (const tenant of tenants) {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          const tenantClient = this.tenantPrisma.getTenantClient(
            tenant.id.toString(),
            dbUrl,
          );

          await this.runForTenant(tenantClient, tenant.id, tenant.dbName);
        } catch (tenantError: any) {
          this.logger.error(
            `Error processing daily automation for tenant ${tenant.id} (${tenant.dbName}):`,
            tenantError?.message || tenantError,
          );
        }
      }
    } finally {
      this.isRunningRunDailyAutomation = false;
    }
  }

  private async runForTenant(
    tenantClient: TenantPrismaClient,
    tenantId: number,
    dbName: string,
  ) {
    let any: { id: number } | null = null;
    try {
      any = await tenantClient.runDailyAutomation.findFirst({
        select: { id: true },
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2021') {
        this.logger.warn(
          `Tenant ${tenantId} (${dbName}) missing RunDailyAutomation table. Run tenant migrations.`,
        );
        return;
      }
      throw e;
    }

    if (!any) return;



    const stop = await tenantClient.chatLabel.findMany({
      where: { labels: { hasSome: ['Stop', 'stop'] } },
      select: { phone: true },
    });
    const stopPhones = new Set(stop.map((x) => x.phone));

    const runs = await tenantClient.runDailyAutomation.findMany({
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            dob: true,
            anniversary: true,
          },
        },
        whatsAppSettings: {
          select: {
            id: true,
            templateName: true,
            apiUrl: true,
            accessToken: true,
            phoneNumberId: true,
            language: true,
            headerImageUrl: true, // ✅ ADDED
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    for (const r of runs) {
      const contact = r.contact;
      const settings = r.whatsAppSettings;

      if (!contact?.phone) continue;
      if (stopPhones.has(contact.phone)) continue;
      if (!settings?.templateName) continue;

      const eventDate =
        r.eventType === 'DOB'
          ? (r.dob ?? contact.dob)
          : (r.anniversary ?? contact.anniversary);

      if (!eventDate) continue;

      const dayOffset = r.dayBefore ?? 0;
      const targetDate = new Date(Date.now() + dayOffset * 86400000);

      const targetMD = getIstMonthDay(targetDate);
      const evMD = getIstMonthDay(new Date(eventDate));
      if (evMD.month !== targetMD.month || evMD.day !== targetMD.day) continue;

      const sentDate = getIstDayStartUtc(new Date());

      const existing = await tenantClient.runDailyAutomationLog.findUnique({
        where: {
          runDailyAutomationId_sentDate: {
            runDailyAutomationId: r.id,
            sentDate,
          },
        },
        select: { id: true, status: true },
      });
      if (existing?.status === 'sent') continue;

      const bodyParams = contact.name ? [contact.name] : [];

      try {
        const messageId = await this.sender.sendTemplate(
          tenantClient,
          settings,
          contact.phone,
          settings.templateName,
          bodyParams,
          {
            fallbackFirstParam: contact.name || '',
            logMessage: `Auto Template ${settings.templateName} sent to ${contact.name || contact.phone}`,
          },
        );
        await tenantClient.runDailyAutomationLog.upsert({
          where: {
            runDailyAutomationId_sentDate: {
              runDailyAutomationId: r.id,
              sentDate,
            },
          },
          create: {
            runDailyAutomationId: r.id,
            contactId: contact.id,
            whatsAppSettingsId: settings.id,
            templateName: settings.templateName,
            status: 'sent',
            messageId,
            sentDate,
          },
          update: {
            status: 'sent',
            messageId,
            error: null,
            sentAt: new Date(),
            templateName: settings.templateName,
            whatsAppSettingsId: settings.id,
            contactId: contact.id,
          },
        });
      } catch (e: any) {
        const errText = e.response?.data
          ? JSON.stringify(e.response.data)
          : e.message;

        await tenantClient.runDailyAutomationLog.upsert({
          where: {
            runDailyAutomationId_sentDate: {
              runDailyAutomationId: r.id,
              sentDate,
            },
          },
          create: {
            runDailyAutomationId: r.id,
            contactId: contact.id,
            whatsAppSettingsId: settings.id,
            templateName: settings.templateName,
            status: 'failed',
            error: errText,
            sentDate,
          },
          update: {
            status: 'failed',
            error: errText,
            sentAt: new Date(),
          },
        });
      }
    }
  }
}