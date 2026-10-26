import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import axios from 'axios';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CampaignService } from '../whatsapp/campaign.service';
import { isWithinAllowedSendingHours, getAllowedSendingWindowInfo } from '../utils/campaign-window.util';

import { ModuleRef, ContextIdFactory } from '@nestjs/core';

@Injectable()
export class MetaLeadsAutomationCronService {
  private readonly logger = new Logger(MetaLeadsAutomationCronService.name);

  private isRunning = false;

  constructor(
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService,
    private moduleRef: ModuleRef,
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleMetaLeadsAutomation() {
    if (this.isRunning) {
      this.logger.debug('Cron already running, skipping this minute...');
      return;
    }

    // Healthy Meta campaign sending rule: Only send between 8:00 AM and 8:00 PM IST
    if (!isWithinAllowedSendingHours()) {
      const windowInfo = getAllowedSendingWindowInfo();
      this.logger.debug(
        `Campaign Automation Cron: Outside allowed sending hours (8:00 AM - 8:00 PM IST). Current IST time: ${windowInfo.currentIstTime}. Messages paused for the night; will resume at 8:00 AM IST.`
      );
      return;
    }

    this.isRunning = true;
    this.logger.debug('Running Meta Leads Automation Cron Job');
    try {
      const activeTenants = await this.centralPrisma.executeWithRetry((prisma) =>
        prisma.tenant.findMany({ where: { isActive: true } })
      );
      this.logger.debug(`Cron: found ${activeTenants.length} active tenant(s)`);
      for (const tenant of activeTenants) {
        try {
          await this.runForTenant(
            String(tenant.id),
            `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`
          );
        } catch (tenantErr: any) {
          this.logger.error(`Error running meta leads automation for tenant ${tenant.id}:`, tenantErr?.message || tenantErr);
        }
      }
    } catch (error) {
      this.logger.error('Failed to run meta leads automation cron', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Exposed publicly so the controller can call it for manual/debug runs.
   * Returns a diagnostic trace object so callers can see exactly what happened.
   */
  async runForTenant(tenantId: string, dbUrl: string): Promise<{ trace: string[] }> {
    const trace: string[] = [];
    const log = (msg: string) => {
      this.logger.debug(`[Tenant ${tenantId}] ${msg}`);
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

    // Check sending window (8:00 AM - 8:00 PM IST)
    if (!isWithinAllowedSendingHours()) {
      const windowInfo = getAllowedSendingWindowInfo();
      warn(`Outside allowed sending hours (8:00 AM - 8:00 PM IST). Current IST time: ${windowInfo.currentIstTime}. Template sending paused until 8:00 AM IST.`);
      return {
        trace: [
          ...trace,
          `🌙 Outside allowed campaign sending hours (8:00 AM - 8:00 PM IST). Current IST time: ${windowInfo.currentIstTime}. Messages are paused for the night to protect WhatsApp reputation and will resume at 8:00 AM IST.`
        ]
      };
    }

    let whatsappService: WhatsappService;
    let contextId: any;
    try {
      contextId = ContextIdFactory.create();
      this.moduleRef.registerRequestByContextId({ tenantContext: { tenantId, dbUrl } }, contextId);
      whatsappService = await this.moduleRef.resolve(WhatsappService, contextId, { strict: false });
    } catch (e) {
      err(`Failed to resolve WhatsappService: ${e.message}`);
      return { trace };
    }

    try {
      const client = await this.tenantPrisma.getTenantClientReady(tenantId, dbUrl) as any;
      log('DB client ready');

      // Auto-resume any campaigns that were paused for the night window
      try {
        const nightPausedCampaigns = await client.campaign.findMany({
          where: {
            status: { in: ['paused_outside_hours', 'paused_night'] }
          }
        });
        if (nightPausedCampaigns.length > 0) {
          log(`Found ${nightPausedCampaigns.length} campaign(s) paused for the night window. Auto-resuming...`);
          const campaignService = await this.moduleRef.resolve(CampaignService, contextId, { strict: false });
          for (const camp of nightPausedCampaigns) {
            log(`Auto-resuming night-paused campaign: id=${camp.id}, name="${camp.name}"`);
            campaignService.runCampaign(camp.id, Number(tenantId), true).catch((e: any) => {
              this.logger.error(`Error auto-resuming campaign ${camp.id}: ${e.message}`);
            });
          }
        }
      } catch (campResumeErr: any) {
        // Ignore if campaign table doesn't have records or other benign error
      }

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
        const earliestCreatedAt = new Date(Math.min(...sequenceRules.map(r => r.createdAt.getTime())));
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
              createdAt: { gte: earliestCreatedAt },
            },
            take: 100, // Batch limit to prevent memory exhaustion
          });
          log(`Found ${pendingRecords.length} pending contact(s) in group created after ${earliestCreatedAt.toISOString()}`);

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
            createdAt: { gte: earliestCreatedAt },
          };
          if (targetType === 'meta_campaign' && firstRule.campaignName) {
            whereClause.campaignName = firstRule.campaignName;
          }
          pendingRecords = await client.metaLead.findMany({ 
            where: whereClause,
            take: 100 // Batch limit to prevent memory exhaustion
          });
          log(`Found ${pendingRecords.length} pending lead(s) created after ${earliestCreatedAt.toISOString()}`);
        }

        // Check for customer opt-out (Stop / stop label)
        let stopPhoneSet = new Set<string>();
        try {
          const stopLabels = await client.chatLabel.findMany({
            where: { labels: { hasSome: ['Stop', 'stop'] } },
            select: { phone: true },
          });
          stopPhoneSet = new Set(stopLabels.map((l: any) => String(l.phone || '').trim().replace(/\D/g, '')));
        } catch (stopErr: any) {
          warn(`Could not query stop labels: ${stopErr.message}`);
        }

        if (stopPhoneSet.size > 0 && pendingRecords.length > 0) {
          const optedOutRecords = pendingRecords.filter((r: any) => {
            const clean = String(r.phone || '').trim().replace(/\D/g, '');
            return stopPhoneSet.has(clean);
          });
          if (optedOutRecords.length > 0) {
            const optedOutIds = optedOutRecords.map((r: any) => r.id);
            if (isContact) {
              await client.contact.updateMany({
                where: { id: { in: optedOutIds } },
                data: { lastAutomationStep: sequenceRules.length },
              });
            } else {
              await client.metaLead.updateMany({
                where: { id: { in: optedOutIds } },
                data: { lastAutomationStep: sequenceRules.length },
              });
            }
            log(`Suppressed ${optedOutRecords.length} opted-out record(s) (STOP label) from automation sequence.`);
            pendingRecords = pendingRecords.filter((r: any) => !optedOutIds.includes(r.id));
          }
        }

        if (!pendingRecords.length) {
          warn(`Sequence [${key}]: no pending records — skipping`);
          continue;
        }

        const pendingRecordIds = pendingRecords.map(r => r.id);
        const allSentLogs = isContact 
          ? await client.contactAutomationLog.findMany({ where: { contactId: { in: pendingRecordIds }, status: 'sent' }, select: { contactId: true, stepIndex: true } })
          : await client.metaLeadAutomationLog.findMany({ where: { metaLeadId: { in: pendingRecordIds }, status: 'sent' }, select: { metaLeadId: true, stepIndex: true } });
        
        const sentLogsSet = new Set(allSentLogs.map((l: any) => `${l.contactId || l.metaLeadId}_${l.stepIndex}`));

        for (let i = 0; i < sequenceRules.length; i++) {
          const rule = sequenceRules[i];
          const templateName = rule.templateName;
          const delayMs = rule.delayMinutes * 60 * 1000;
          log(`  Step ${i + 1}: template="${templateName}", delay=${rule.delayMinutes}min (${delayMs}ms)`);

          let recordsToAdvanceWithoutSending: any[] = [];
          const eligibleRecords = pendingRecords.filter(record => {
            if (record.lastAutomationStep !== i) return false;
            
            // IDEMPOTENCY CHECK: If they already have a 'sent' log for this step, just advance them!
            // This enables "Retry Failed" by simply resetting lastAutomationStep backwards without duplicating later steps.
            if (sentLogsSet.has(`${record.id}_${i + 1}`)) {
              recordsToAdvanceWithoutSending.push(record.id);
              return false;
            }

            // Measure delay ABSOLUTELY from the time the lead was added
            const baseTime = record.createdAt.getTime();
            const elapsed = now.getTime() - baseTime;
            const eligible = elapsed >= delayMs;
            log(`    Record id=${record.id} lastStep=${record.lastAutomationStep} elapsed=${Math.round(elapsed / 1000)}s needed=${Math.round(delayMs / 1000)}s → ${eligible ? 'ELIGIBLE' : 'NOT YET'}`);
            return eligible;
          });

          if (recordsToAdvanceWithoutSending.length > 0) {
            if (isContact) {
              await client.contact.updateMany({ where: { id: { in: recordsToAdvanceWithoutSending } }, data: { lastAutomationStep: i + 1 } });
            } else {
              await client.metaLead.updateMany({ where: { id: { in: recordsToAdvanceWithoutSending } }, data: { lastAutomationStep: i + 1 } });
            }
            log(`  Idempotency: Fast-forwarded ${recordsToAdvanceWithoutSending.length} record(s) past step ${i + 1} because they already received it.`);
            
            // Update the pendingRecords array in memory so they process the NEXT step correctly on the NEXT cron run
            for (const record of pendingRecords) {
              if (recordsToAdvanceWithoutSending.includes(record.id)) {
                record.lastAutomationStep = i + 1;
              }
            }
          }

          if (!eligibleRecords.length) {
            warn(`  Step ${i + 1}: 0 eligible records — delay not met yet or all at wrong step`);
            continue;
          }

          log(`  Step ${i + 1}: ${eligibleRecords.length} eligible record(s) — proceeding to send`);
          const recordIds = eligibleRecords.map((r: any) => r.id);

          try {
            const masterConfig = await client.masterConfig.findFirst({ where: { isActive: true } });
            if (!masterConfig) throw new Error('No active MasterConfig found for tenant');
            const { phoneNumberId } = masterConfig;

            const settings = await client.whatsAppSettings.findFirst({ where: { templateName } });

            // Create payload for sendBulkTemplateMessageWithNames
            const batchContacts = eligibleRecords.map((r: any) => ({
              name: r.name || '',
              phone: r.phone
            }));

            log(`  Calling sendBulkTemplateMessageWithNames for ${batchContacts.length} contacts...`);
            // IMPORTANT: whatsappService.sendBulkTemplateMessageWithNames ALREADY creates the WhatsAppMessage records in the DB
            // for the chat UI, so we don't need to do it here manually!
            const bulkResults = await whatsappService.sendBulkTemplateMessageWithNames(
              batchContacts,
              templateName,
              parseInt(tenantId),
              settings?.id,
              settings?.headerImageUrl?.trim() ? settings.headerImageUrl.trim() : undefined
            );

            // Map results back to original contact IDs based on phone
            const sendResults = eligibleRecords.map((record: any) => {
              const formattedPhone = String(record.phone || '').trim().replace(/\D/g, '');
              const result = bulkResults.find(r => r.phoneNumber.replace(/\D/g, '').includes(formattedPhone) || formattedPhone.includes(r.phoneNumber.replace(/\D/g, '')));
              return {
                id: record.id,
                success: result?.success || false,
                wamid: (result as any)?.messageId,
                error: result?.error || 'Failed to match result'
              };
            });

            const sentCount = sendResults.filter(r => r.success).length;
            const failCount = sendResults.filter(r => !r.success).length;
            log(`  Step ${i + 1} result: ${sentCount} sent, ${failCount} failed`);

            // Write logs and advance ALL attempted contacts to prevent infinite retry loops on failure
            const stepAdvancedAt = new Date();
            const processedRecordIds = recordIds;

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
              if (processedRecordIds.length > 0) {
                await client.contact.updateMany({
                  where: { id: { in: processedRecordIds } },
                  data: { isAutomationSent: true, automationSentAt: stepAdvancedAt, lastAutomationStep: i + 1 },
                });
                log(`  Advanced ${processedRecordIds.length} contact(s) to step ${i + 1}`);
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
              if (processedRecordIds.length > 0) {
                await client.metaLead.updateMany({
                  where: { id: { in: processedRecordIds } },
                  data: { isAutomationSent: true, automationSentAt: stepAdvancedAt, lastAutomationStep: i + 1 },
                });
                log(`  Advanced ${processedRecordIds.length} lead(s) to step ${i + 1}`);
              }
            }

            // DO NOT update in-memory records here!
            // By skipping in-memory updates, we ensure that a single contact
            // can only advance ONE step per minute (cron tick).
            // This acts as a critical throttle to prevent WhatsApp spam bans 
            // when resuming paused sequences where all time delays have already been met.
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
