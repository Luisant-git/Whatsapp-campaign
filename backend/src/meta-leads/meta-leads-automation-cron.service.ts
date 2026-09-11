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
      this.logger.debug(`Cron: found ${activeTenants.length} active tenant(s)`);
      for (const tenant of activeTenants) {
        await this.runForTenant(String(tenant.id),
          `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`
        );
      }
    } catch (error) {
      this.logger.error('Failed to run meta leads automation cron', error);
    }
  }

  /**
   * Exposed publicly so the controller can call it for manual/debug runs.
   * Returns a diagnostic trace object so callers can see exactly what happened.
   */
  async runForTenant(tenantId: string, dbUrl: string): Promise<{ trace: string[] }> {
    const trace: string[] = [];
    const log = (msg: string) => {
      this.logger.log(`[Tenant ${tenantId}] ${msg}`);
      trace.push(msg);
    };
    const warn = (msg: string) => {
      this.logger.warn(`[Tenant ${tenantId}] ${msg}`);
      trace.push(`⚠ ${msg}`);
    };
    const err = (msg: string) => {
      this.logger.error(`[Tenant ${tenantId}] ${msg}`);
      trace.push(`✗ ${msg}`);
    };

    try {
      const client = await this.tenantPrisma.getTenantClientReady(tenantId, dbUrl) as any;
      log('DB client ready');

      const activeRules = await client.metaLeadAutomation.findMany({
        where: { isActive: true },
        orderBy: { delayMinutes: 'asc' },
      });
      log(`Found ${activeRules.length} active automation rule(s)`);

      if (!activeRules.length) {
        warn('No active rules — nothing to do');
        return { trace };
      }

      const now = new Date();

      // Group rules into sequences by (targetType, campaignName, groupId)
      const targetSequences = new Map<string, any[]>();
      for (const rule of activeRules) {
        const key = `${rule.targetType}_${rule.campaignName || 'all'}_${rule.groupId || 'all'}`;
        if (!targetSequences.has(key)) targetSequences.set(key, []);
        targetSequences.get(key)!.push(rule);
      }
      log(`Grouped into ${targetSequences.size} sequence(s): ${[...targetSequences.keys()].join(', ')}`);

      for (const [key, sequenceRules] of targetSequences.entries()) {
        const firstRule = sequenceRules[0];
        const targetType = firstRule.targetType;
        log(`--- Processing sequence [${key}] — ${sequenceRules.length} step(s), targetType=${targetType}`);

        let pendingRecords: any[] = [];
        let isContact = false;

        if (targetType === 'contact_group') {
          isContact = true;
          const gid = firstRule.groupId;
          log(`Querying contacts with groupId=${gid} AND lastAutomationStep < ${sequenceRules.length}`);
          pendingRecords = await client.contact.findMany({
            where: {
              phone: { not: '' },
              groupId: gid,
              lastAutomationStep: { lt: sequenceRules.length },
            },
          });
          log(`Found ${pendingRecords.length} pending contact(s) in group`);

          // Diagnostic: also count total in group regardless of step
          const totalInGroup = await client.contact.count({ where: { groupId: gid } });
          const alreadyDone = await client.contact.count({ where: { groupId: gid, lastAutomationStep: { gte: sequenceRules.length } } });
          log(`Group total=${totalInGroup}, already completed=${alreadyDone}, pending=${pendingRecords.length}`);

          if (pendingRecords.length > 0) {
            log(`Sample pending contact: id=${pendingRecords[0].id}, phone="${pendingRecords[0].phone}", lastStep=${pendingRecords[0].lastAutomationStep}, createdAt=${pendingRecords[0].createdAt}`);
          }
        } else {
          const whereClause: any = {
            phone: { not: null },
            lastAutomationStep: { lt: sequenceRules.length },
          };
          if (targetType === 'meta_campaign' && firstRule.campaignName) {
            whereClause.campaignName = firstRule.campaignName;
          }
          pendingRecords = await client.metaLead.findMany({ where: whereClause });
          log(`Found ${pendingRecords.length} pending lead(s)`);
        }

        if (!pendingRecords.length) {
          warn(`Sequence [${key}]: no pending records — skipping`);
          continue;
        }

        for (let i = 0; i < sequenceRules.length; i++) {
          const rule = sequenceRules[i];
          const templateName = rule.templateName;
          const delayMs = rule.delayMinutes * 60 * 1000;
          log(`  Step ${i + 1}: template="${templateName}", delay=${rule.delayMinutes}min (${delayMs}ms)`);

          const eligibleRecords = pendingRecords.filter(record => {
            if (record.lastAutomationStep !== i) return false;
            const baseTime = i === 0
              ? record.createdAt.getTime()
              : (record.automationSentAt?.getTime() ?? record.createdAt.getTime());
            const elapsed = now.getTime() - baseTime;
            const eligible = elapsed >= delayMs;
            // Verbose: log every record's eligibility check
            log(`    Record id=${record.id} lastStep=${record.lastAutomationStep} elapsed=${Math.round(elapsed / 1000)}s needed=${Math.round(delayMs / 1000)}s → ${eligible ? 'ELIGIBLE' : 'NOT YET'}`);
            return eligible;
          });

          if (!eligibleRecords.length) {
            warn(`  Step ${i + 1}: 0 eligible records — delay not met yet or all at wrong step`);
            continue;
          }

          log(`  Step ${i + 1}: ${eligibleRecords.length} eligible record(s) — proceeding to send`);
          const recordIds = eligibleRecords.map((r: any) => r.id);

          try {
            const masterConfig = await client.masterConfig.findFirst({ where: { isActive: true } });
            if (!masterConfig) throw new Error('No active MasterConfig found for tenant');
            log(`  MasterConfig found: phoneNumberId=${masterConfig.phoneNumberId}`);

            const { phoneNumberId, accessToken } = masterConfig;
            const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

            // Fetch template details
            let templateLanguage = 'en';
            let templateHasBodyVar = false;
            try {
              const dbTemplate = await client.messageTemplate.findFirst({
                where: { name: templateName },
                select: { language: true, components: true },
              });
              if (dbTemplate?.language) templateLanguage = dbTemplate.language;
              log(`  Template "${templateName}" found in DB, language=${templateLanguage}`);
              if (dbTemplate?.components) {
                const comps = typeof dbTemplate.components === 'string'
                  ? JSON.parse(dbTemplate.components)
                  : dbTemplate.components;
                const body = comps.find((c: any) => c.type === 'BODY');
                templateHasBodyVar = body?.text ? /\{\{\d+\}\}/.test(body.text) : false;
                log(`  Template has body variable: ${templateHasBodyVar}`);
              }
            } catch {
              warn(`  Could not fetch template "${templateName}" from DB — using defaults (lang=en, no vars)`);
            }

            // Send per-contact
            const sendResults: { id: number; success: boolean; error?: string }[] = [];

            for (const contact of eligibleRecords) {
              // Normalize to E.164 (+<digits>)
              const rawPhone = String(contact.phone || '').trim();
              const digitsOnly = rawPhone.replace(/\D/g, '');
              const toPhone = `+${digitsOnly}`;

              if (!digitsOnly) {
                sendResults.push({ id: contact.id, success: false, error: 'Empty phone number' });
                warn(`  Skipping contact id=${contact.id} — empty phone`);
                continue;
              }

              log(`  Sending to contact id=${contact.id} phone=${toPhone} (stored: "${rawPhone}")`);

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

                const wamid = metaResponse.data?.messages?.[0]?.id;
                if (!wamid) {
                  const warning = `Meta returned no wamid — response: ${JSON.stringify(metaResponse.data)}`;
                  warn(`  ${contact.phone}: ${warning}`);
                  sendResults.push({ id: contact.id, success: true, error: warning });
                } else {
                  log(`  ✓ Sent to ${toPhone} — wamid: ${wamid}`);
                  sendResults.push({ id: contact.id, success: true });
                }
              } catch (sendErr: any) {
                const metaErr = sendErr.response?.data?.error;
                const errorMsg = metaErr
                  ? `[${metaErr.code}] ${metaErr.message}${metaErr.error_data?.details ? ' — ' + metaErr.error_data.details : ''}`
                  : sendErr.message || String(sendErr);
                sendResults.push({ id: contact.id, success: false, error: errorMsg });
                err(`  ✗ Failed for ${toPhone}: ${errorMsg}`);
              }
            }

            const sentCount = sendResults.filter(r => r.success).length;
            const failCount = sendResults.filter(r => !r.success).length;
            log(`  Step ${i + 1} result: ${sentCount} sent, ${failCount} failed`);

            // Write logs and advance only successful contacts
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
              if (successRecordIds.length > 0) {
                await client.contact.updateMany({
                  where: { id: { in: successRecordIds } },
                  data: { isAutomationSent: true, automationSentAt: stepAdvancedAt, lastAutomationStep: i + 1 },
                });
                log(`  Advanced ${successRecordIds.length} contact(s) to step ${i + 1}`);
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
              if (successRecordIds.length > 0) {
                await client.metaLead.updateMany({
                  where: { id: { in: successRecordIds } },
                  data: { isAutomationSent: true, automationSentAt: stepAdvancedAt, lastAutomationStep: i + 1 },
                });
                log(`  Advanced ${successRecordIds.length} lead(s) to step ${i + 1}`);
              }
            }

            // Update in-memory records for subsequent steps this tick
            for (const record of pendingRecords) {
              if (successIds.has(record.id)) {
                record.lastAutomationStep = i + 1;
                record.automationSentAt = stepAdvancedAt;
              }
            }
          } catch (stepErr: any) {
            err(`  Outer error for step ${i + 1}: ${stepErr?.message || stepErr}`);
          }
        }
      }

      log('Done');
    } catch (error: any) {
      err(`Fatal error: ${error?.message || error}`);
    }

    return { trace };
  }
}
