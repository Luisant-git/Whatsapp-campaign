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
  ) { }

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
            // Step 0 (first step): delay is measured from when the record was created.
            // Steps 1+ (subsequent steps): delay is measured from when the previous
            // step was sent (automationSentAt). This ensures "wait 5 minutes" means
            // 5 minutes after the prior step, not 5 minutes after contact creation.
            const baseTime = i === 0
              ? record.createdAt.getTime()
              : (record.automationSentAt?.getTime() ?? record.createdAt.getTime());
            return (now.getTime() - baseTime) >= delayMs;
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
              // Normalize to E.164: strip all non-digits then prepend '+'.
              // Meta's Graph API v18+ requires the 'to' field in E.164 format
              // (e.g. +917824017222). Sending a raw stored number without the '+'
              // causes silent delivery failures — Meta returns HTTP 200 but never
              // queues the message.
              const rawPhone = String(contact.phone || '').trim();
              const digitsOnly = rawPhone.replace(/\D/g, '');
              const toPhone = digitsOnly.startsWith('+')
                ? rawPhone          // already has +, keep as-is
                : `+${digitsOnly}`; // prepend +

              if (!digitsOnly) {
                sendResults.push({ id: contact.id, success: false, error: 'Empty phone number' });
                this.logger.warn(`Tenant ${tenantId}: Skipping contact ${contact.id} — empty phone`);
                continue;
              }

              try {
                const components: any[] = [];
                if (templateHasBodyVar && contact.name) {
                  components.push({
                    type: 'body',
                    parameters: [{ type: 'text', text: contact.name }],
                  });
                }
                const metaResponse = await axios.post(apiUrl, {
                  messaging_product: 'whatsapp',
                  to: toPhone,
                  type: 'template',
                  template: {
                    name: templateName,
                    language: { code: templateLanguage },
                    ...(components.length > 0 && { components }),
                  },
                }, {
                  headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                });

                // Meta returns HTTP 200 even when it silently drops the message.
                // A genuine acceptance always includes a messages[0].id (wamid).
                const wamid = metaResponse.data?.messages?.[0]?.id;
                if (!wamid) {
                  const warning = `Meta accepted request but returned no wamid — message may not have been queued. Response: ${JSON.stringify(metaResponse.data)}`;
                  this.logger.warn(`Tenant ${tenantId}: ${contact.phone} — ${warning}`);
                  // Still mark success so we don't endlessly retry — the API accepted it
                  sendResults.push({ id: contact.id, success: true, error: warning });
                } else {
                  this.logger.log(`Tenant ${tenantId}: Sent to ${toPhone} — wamid: ${wamid}`);
                  sendResults.push({ id: contact.id, success: true });
                }
              } catch (sendErr: any) {
                const metaErr = sendErr.response?.data?.error;
                const errorMsg = metaErr
                  ? `[${metaErr.code}] ${metaErr.message}${metaErr.error_data?.details ? ' — ' + metaErr.error_data.details : ''}`
                  : sendErr.message || String(sendErr);
                sendResults.push({ id: contact.id, success: false, error: errorMsg });
                this.logger.warn(`Tenant ${tenantId}: Failed for ${toPhone}: ${errorMsg}`);
              }
            }

            const sentCount = sendResults.filter(r => r.success).length;
            const failCount = sendResults.filter(r => !r.success).length;
            this.logger.log(`Tenant ${tenantId}: Step ${i + 1} — ${sentCount} sent, ${failCount} failed.`);

            // Write per-contact logs.
            // Only advance lastAutomationStep for contacts where the send SUCCEEDED.
            // Failed contacts keep their current step so the cron retries them next tick.
            const stepAdvancedAt = new Date();
            const successIds = new Set(sendResults.filter(r => r.success).map(r => r.id));
            const successRecordIds = recordIds.filter(id => successIds.has(id));

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
              // Only advance contacts that were sent successfully
              if (successRecordIds.length > 0) {
                await client.contact.updateMany({
                  where: { id: { in: successRecordIds } },
                  data: { isAutomationSent: true, automationSentAt: stepAdvancedAt, lastAutomationStep: i + 1 },
                });
              }
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
              // Only advance leads that were sent successfully
              if (successRecordIds.length > 0) {
                await client.metaLead.updateMany({
                  where: { id: { in: successRecordIds } },
                  data: { isAutomationSent: true, automationSentAt: stepAdvancedAt, lastAutomationStep: i + 1 },
                });
              }
            }

            // Update in-memory records so subsequent step iterations in this
            // same cron tick see the updated lastAutomationStep and automationSentAt.
            // Only update successfully-sent records — failed ones stay at their current
            // step so they appear eligible for retry in the next tick.
            for (const record of pendingRecords) {
              if (successIds.has(record.id)) {
                record.lastAutomationStep = i + 1;
                record.automationSentAt = stepAdvancedAt;
              }
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
