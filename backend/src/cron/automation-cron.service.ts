import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { AutoTemplateSenderService } from './auto-template-sender.service';
import { Prisma, PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';

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

  constructor(
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService,
    private sender: AutoTemplateSenderService,
  ) {}

  // TEST: every minute. PROD: '0 9 * * *'
  @Cron(process.env.AUTOMATION_CRON || '* * * * *', {
    timeZone: 'Asia/Kolkata',
  })
  async runDailyAutomation() {
    const tenants = await this.centralPrisma.tenant.findMany({
      where: { isActive: true },
    });
  
    for (const tenant of tenants) {
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(
        tenant.id.toString(),
        dbUrl,
      );
  
      await this.runForTenant(tenantClient, tenant.id, tenant.dbName);
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