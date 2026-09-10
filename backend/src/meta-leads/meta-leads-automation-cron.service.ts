import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import axios from 'axios';

@Injectable()
export class MetaLeadsAutomationCronService {
  private readonly logger = new Logger(MetaLeadsAutomationCronService.name);

  constructor(
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleMetaLeadsAutomation() {
    this.logger.debug('Running Meta Leads Automation Cron Job');
    try {
      const activeTenants = await this.centralPrisma.executeWithRetry((prisma) =>
        prisma.tenant.findMany({ where: { isActive: true } })
      );
      for (const tenant of activeTenants) {
        await this.processTenantAutomation(tenant);
      }
    } catch (error) {
      this.logger.error('Failed to run meta leads automation cron', error);
    }
  }

  private async processTenantAutomation(tenant: any) {
    const tenantId = String(tenant.id);
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;

    try {
      const client = await this.tenantPrisma.getTenantClientReady(tenantId, dbUrl) as any;

      const activeRules = await client.metaLeadAutomation.findMany({
        where: { isActive: true },
        orderBy: { delayMinutes: 'asc' },
      });

      if (!activeRules.length) return;

      const now = new Date();

      const targetSequences = new Map<string, any[]>();
      for (const rule of activeRules) {
        const key = `${rule.targetType}_${rule.campaignName || 'all'}_${rule.groupId || 'all'}`;
        if (!targetSequences.has(key)) targetSequences.set(key, []);
        targetSequences.get(key)!.push(rule);
      }

      for (const [key, sequenceRules] of targetSequences.entries()) {
        const firstRule = sequenceRules[0];
        const targetType = firstRule.targetType;

        let pendingRecords: any[] = [];
        let isContact = false;

        if (targetType === 'contact_group') {
          isContact = true;
          pendingRecords = await client.contact.findMany({
            where: {
              phone: { not: '' },
              groupId: firstRule.groupId,
              lastAutomationStep: { lt: sequenceRules.length },
            },
          });
        } else {
          const whereClause: any = {
            phone: { not: null },
            lastAutomationStep: { lt: sequenceRules.length },
          };
          if (targetType === 'meta_campaign' && firstRule.campaignName) {
            whereClause.campaignName = firstRule.campaignName;
          }
          pendingRecords = await client.metaLead.findMany({ where: whereClause });
        }

        if (!pendingRecords.length) continue;

        for (let i = 0; i < sequenceRules.length; i++) {
          const rule = sequenceRules[i];
          const templateName = rule.templateName;
          const delayMs = rule.delayMinutes * 60 * 1000;

          const eligibleRecords = pendingRecords.filter(record => {
            if (record.lastAutomationStep !== i) return false;
            return (now.getTime() - record.createdAt.getTime()) >= delayMs;
          });

          if (!eligibleRecords.length) continue;

          this.logger.log(`Tenant ${tenantId}: Found ${eligibleRecords.length} records for step ${i + 1} (${key}, template: ${templateName})`);

          const recordIds = eligibleRecords.map((r: any) => r.id);

          try {
            const masterConfig = await client.masterConfig.findFirst({ where: { isActive: true } });
            if (!masterConfig) throw new Error('No active MasterConfig found for tenant');

            const { phoneNumberId, accessToken } = masterConfig;
            const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

            // Fetch template language + check if body has variables
            let templateLanguage = 'en';
            let templateHasBodyVar = false;
            try {
              const dbTemplate = await client.messageTemplate.findFirst({
                where: { name: templateName },
                select: { language: true, components: true },
              });
              if (dbTemplate?.language) templateLanguage = dbTemplate.language;
              if (dbTemplate?.components) {
                const comps = typeof dbTemplate.components === 'string'
                  ? JSON.parse(dbTemplate.components)
                  : dbTemplate.components;
                const body = comps.find((c: any) => c.type === 'BODY');
                templateHasBodyVar = body?.text ? /\{\{\d+\}\}/.test(body.text) : false;
              }
            } catch {
              this.logger.warn(`Could not fetch template ${templateName} from DB, using defaults`);
            }

            // Send per-contact, capture individual results
            const sendResults: { id: number; success: boolean; error?: string }[] = [];

            for (const contact of eligibleRecords) {
              try {
                const components: any[] = [];
                if (templateHasBodyVar && contact.name) {
                  components.push({
                    type: 'body',
                    parameters: [{ type: 'text', text: contact.name }],
                  });
                }
                await axios.post(apiUrl, {
                  messaging_product: 'whatsapp',
                  to: contact.phone,
                  type: 'template',
                  template: {
                    name: templateName,
                    language: { code: templateLanguage },
                    ...(components.length > 0 && { components }),
                  },
                }, {
                  headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                });
                sendResults.push({ id: contact.id, success: true });
              } catch (sendErr: any) {
                const metaErr = sendErr.response?.data?.error;
                const errorMsg = metaErr
                  ? `[${metaErr.code}] ${metaErr.message}${metaErr.error_data?.details ? ' — ' + metaErr.error_data.details : ''}`
                  : sendErr.message || String(sendErr);
                sendResults.push({ id: contact.id, success: false, error: errorMsg });
                this.logger.warn(`Tenant ${tenantId}: Failed for ${contact.phone}: ${errorMsg}`);
              }
            }

            const sentCount = sendResults.filter(r => r.success).length;
            const failCount = sendResults.filter(r => !r.success).length;
            this.logger.log(`Tenant ${tenantId}: Step ${i + 1} — ${sentCount} sent, ${failCount} failed.`);

            // Write per-contact logs and advance step
            if (isContact) {
              await client.contactAutomationLog.createMany({
                data: eligibleRecords.map((record: any) => {
                  const result = sendResults.find(r => r.id === record.id);
                  return {
                    contactId: record.id,
                    templateName,
                    status: result?.success ? 'sent' : 'failed',
                    error: result?.error || null,
                    stepIndex: i + 1,
                  };
                }),
              });
              await client.contact.updateMany({
                where: { id: { in: recordIds } },
                data: { isAutomationSent: true, automationSentAt: new Date(), lastAutomationStep: i + 1 },
              });
            } else {
              await client.metaLeadAutomationLog.createMany({
                data: eligibleRecords.map((record: any) => {
                  const result = sendResults.find(r => r.id === record.id);
                  return {
                    metaLeadId: record.id,
                    templateName,
                    status: result?.success ? 'sent' : 'failed',
                    error: result?.error || null,
                    stepIndex: i + 1,
                  };
                }),
              });
              await client.metaLead.updateMany({
                where: { id: { in: recordIds } },
                data: { isAutomationSent: true, automationSentAt: new Date(), lastAutomationStep: i + 1 },
              });
            }
          } catch (err: any) {
            this.logger.error(`Tenant ${tenantId}: Outer error for step ${i + 1}: ${err?.message || err}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing tenant ${tenantId} automation:`, error);
    }
  }
}
