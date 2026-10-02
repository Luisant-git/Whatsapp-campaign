import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import axios from 'axios';

@Injectable()
export class MetaLeadsAutomationCronService {
  private readonly logger = new Logger(MetaLeadsAutomationCronService.name);

  private isRunning = false;

  constructor(
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService,
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleMetaLeadsAutomation() {
    if (this.isRunning) {
      this.logger.debug('Cron already running, skipping this minute...');
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
        await this.runForTenant(String(tenant.id),
          `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`
        );
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
            // Step 0: measure delay from updatedAt, not createdAt.
            // Using updatedAt means:
            //   - For brand-new contacts: updatedAt ≈ createdAt, so delay is
            //     counted from when they were added. ✓
            //   - For reset contacts: updatedAt is the reset timestamp, so the
            //     delay is counted from the reset, not from the original creation
            //     date weeks/months ago. ✓
            // Steps 1+: measure from automationSentAt (when previous step sent).
            const baseTime = i === 0
              ? record.updatedAt.getTime()
              : (record.automationSentAt?.getTime() ?? record.updatedAt.getTime());
            const elapsed = now.getTime() - baseTime;
            const eligible = elapsed >= delayMs;
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
            let headerFormat = 'IMAGE';
            let headerImageUrl: string | null = null;
            let isCarouselTemplate = false;
            let carouselComponents: any[] | null = null;
            try {
              const settings = await client.whatsAppSettings.findFirst({
                where: { templateName },
              });
              headerImageUrl = settings?.headerImageUrl || null;

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

                const isCarousel = comps.some((c: any) => String(c.type).toUpperCase() === 'CAROUSEL');
                if (isCarousel) {
                  isCarouselTemplate = true;
                  const carouselComp = comps.find((c: any) => String(c.type).toUpperCase() === 'CAROUSEL');
                  if (carouselComp?.cards) {
                    const cards = carouselComp.cards.map((card: any, cardIndex: number) => {
                      const cardComps: any[] = [];
                      for (const comp of (card.components || [])) {
                        if (String(comp.type).toUpperCase() === 'BODY') {
                          const vars = comp.text?.match(/\{\{\s*\d+\s*\}\}/g) || [];
                          if (vars.length > 0) {
                            cardComps.push({ type: 'body', parameters: vars.map(() => ({ type: 'text', text: 'Customer' })) });
                          }
                        }
                      }
                      if (cardComps.length > 0) return { card_index: cardIndex, components: cardComps };
                      return null;
                    }).filter(Boolean);
                    if (cards.length > 0) carouselComponents = [{ type: 'carousel', cards }];
                  }
                } else {
                  const body = comps.find((c: any) => String(c.type).toUpperCase() === 'BODY');
                  if (body) {
                    if (body.text && /\{\{\s*\d+\s*\}\}/.test(body.text)) {
                      templateHasBodyVar = true;
                    } else if (body.example && body.example.body_text && body.example.body_text.length > 0) {
                      templateHasBodyVar = true;
                    }
                  }
                  
                  const header = comps.find((c: any) => String(c.type).toUpperCase() === 'HEADER');
                  if (header?.format) {
                    headerFormat = header.format;
                  } else if (headerImageUrl) {
                    const isVideo = /\.(mp4|avi|mov)$/i.test(headerImageUrl);
                    const isDocument = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(headerImageUrl);
                    headerFormat = isDocument ? 'DOCUMENT' : isVideo ? 'VIDEO' : 'IMAGE';
                  }
                }
                log(`  Template isCarousel: ${isCarouselTemplate}, hasBodyVar: ${templateHasBodyVar}`);
              } else {
                log(`  Template "${templateName}" not found in DB! Using default fallback heuristics.`);
              }
            } catch (e) {
              warn(`  Error fetching template "${templateName}" from DB — using defaults (lang=en, no vars)`);
            }

            // Fallback for tricky templates
            if (templateName === 'educate_add_value' && !isCarouselTemplate) {
               // If for some reason DB parsing failed or was empty, force it as a carousel with 2 cards.
               isCarouselTemplate = true;
               carouselComponents = [{
                 type: 'carousel',
                 cards: [
                   { card_index: 0, components: [{ type: 'body', parameters: [{ type: 'text', text: 'Customer' }] }] },
                   { card_index: 1, components: [{ type: 'body', parameters: [{ type: 'text', text: 'Customer' }] }] }
                 ]
               }];
               log(`  Fallback: Forced carousel for ${templateName}`);
            }

            // Send per-contact
            const sendResults: { id: number; success: boolean; wamid?: string; error?: string }[] = [];

            for (const contact of eligibleRecords) {
              const rawPhone = String(contact.phone || '').trim();
              const digitsOnly = rawPhone.replace(/\D/g, '');
              const toPhone = `+${digitsOnly}`;

              if (!digitsOnly) {
                sendResults.push({ id: contact.id, success: false, error: 'Empty phone number' });
                warn(`  Skipping contact id=${contact.id} — empty phone`);
                continue;
              }

              log(`  Sending to contact id=${contact.id} phone=${toPhone}`);

              try {
                const components: any[] = [];
                if (!isCarouselTemplate && headerImageUrl && headerImageUrl.trim() !== '' && headerImageUrl.startsWith('http')) {
                  const mediaType = headerFormat.toLowerCase();
                  components.push({
                    type: 'header',
                    parameters: [{ type: mediaType, [mediaType]: { link: headerImageUrl } }],
                  });
                }

                if (isCarouselTemplate && carouselComponents) {
                  // If it's a carousel, inject the contact name dynamically per user
                  const clonedCarousel = JSON.parse(JSON.stringify(carouselComponents));
                  clonedCarousel[0].cards.forEach((card: any) => {
                    card.components.forEach((comp: any) => {
                      if (comp.type === 'body') {
                        comp.parameters.forEach((param: any) => {
                          if (param.type === 'text') param.text = contact.name || 'Customer';
                        });
                      }
                    });
                  });
                  components.push(...clonedCarousel);
                } else if (templateHasBodyVar) {
                  components.push({
                    type: 'body',
                    parameters: [{ type: 'text', text: contact.name || 'Customer' }],
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
                  sendResults.push({ id: contact.id, success: true });
                } else {
                  log(`  ✓ Sent to ${toPhone} — wamid: ${wamid}`);
                  sendResults.push({ id: contact.id, success: true, wamid });
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

            // Write logs and advance ALL attempted contacts to prevent infinite retry loops on failure
            const stepAdvancedAt = new Date();
            const successIds = new Set(sendResults.filter(r => r.success).map(r => r.id));
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

              // Save a WhatsAppMessage record for every successful contact send so
              // the template bubble appears in the WhatsApp chat page for that contact.
              const successContacts = eligibleRecords.filter((r: any) => successIds.has(r.id));
              if (successContacts.length > 0) {
                const chatMessages = successContacts.map((contact: any) => {
                  const rawPhone = String(contact.phone || '').trim();
                  const digitsOnly = rawPhone.replace(/\D/g, '');
                  const toPhone = `+${digitsOnly}`; // E.164 used only for Meta API call
                  const sendResult = sendResults.find(r => r.id === contact.id);
                  const messageId = sendResult?.wamid || `auto_${contact.id}_step${i + 1}_${Date.now()}`;
                  return {
                    messageId,
                    // Use digitsOnly (no +) for from/to so this message is grouped
                    // into the same chat thread as existing messages. The chat list
                    // groups by "from" + "phoneNumberId" — if existing messages store
                    // "919360999351" then we must store "919360999351" too, not
                    // "+919360999351", otherwise a duplicate separate chat appears.
                    to: digitsOnly,
                    from: digitsOnly,
                    message: `Template ${templateName} sent to ${contact.name || digitsOnly}`,
                    direction: 'outgoing',
                    status: 'sent',
                    phoneNumberId: masterConfig.phoneNumberId,
                  };
                });
                try {
                  await client.whatsAppMessage.createMany({
                    data: chatMessages,
                    skipDuplicates: true,
                  });
                  log(`  Saved ${chatMessages.length} chat message(s) for template preview in chat`);
                } catch (msgErr: any) {
                  warn(`  Could not save chat messages: ${msgErr?.message}`);
                }
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

              // Save chat messages for leads too (matched by phone in the chat list)
              const successLeads = eligibleRecords.filter((r: any) => successIds.has(r.id));
              if (successLeads.length > 0) {
                const chatMessages = successLeads.map((lead: any) => {
                  const rawPhone = String(lead.phone || '').trim();
                  const digitsOnly = rawPhone.replace(/\D/g, '');
                  const sendResult = sendResults.find(r => r.id === lead.id);
                  const messageId = sendResult?.wamid || `auto_lead_${lead.id}_step${i + 1}_${Date.now()}`;
                  return {
                    messageId,
                    to: digitsOnly,
                    from: digitsOnly,
                    message: `Template ${templateName} sent to ${lead.name || digitsOnly}`,
                    direction: 'outgoing',
                    status: 'sent',
                    phoneNumberId: masterConfig.phoneNumberId,
                  };
                });
                try {
                  await client.whatsAppMessage.createMany({
                    data: chatMessages,
                    skipDuplicates: true,
                  });
                  log(`  Saved ${chatMessages.length} chat message(s) for template preview in chat`);
                } catch (msgErr: any) {
                  warn(`  Could not save chat messages: ${msgErr?.message}`);
                }
              }
            }

            // Update in-memory records for subsequent steps this tick
            for (const record of pendingRecords) {
              if (recordIds.includes(record.id)) {
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
