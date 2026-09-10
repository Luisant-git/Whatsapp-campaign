import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class MetaLeadsAutomationCronService {
  private readonly logger = new Logger(MetaLeadsAutomationCronService.name);

  constructor(
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService,
    private whatsappService: WhatsappService,
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

      // Fetch active automation rules sorted by delay to form a sequence
      const activeRules = await client.metaLeadAutomation.findMany({
        where: { isActive: true },
        orderBy: { delayMinutes: 'asc' },
      });

      if (!activeRules.length) return;

      const now = new Date();

      // Group rules by target sequence
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
          // targetType === 'meta_campaign' or 'all'
          const whereClause: any = {
            phone: { not: null },
            lastAutomationStep: { lt: sequenceRules.length },
          };
          if (targetType === 'meta_campaign' && firstRule.campaignName) {
            whereClause.campaignName = firstRule.campaignName;
          }
          pendingRecords = await client.metaLead.findMany({
            where: whereClause,
          });
        }

        if (!pendingRecords.length) continue;

        for (let i = 0; i < sequenceRules.length; i++) {
          const rule = sequenceRules[i];
          const templateName = rule.templateName;
          const delayMs = rule.delayMinutes * 60 * 1000;

          // Filter records that are on this exact step in the sequence
          const eligibleRecords = pendingRecords.filter(record => {
            if (record.lastAutomationStep !== i) return false;
            const createdTime = record.createdAt.getTime();
            // Check if time passed since creation satisfies the delay
            return (now.getTime() - createdTime) >= delayMs;
          });

          if (eligibleRecords.length > 0) {
            this.logger.log(`Tenant ${tenantId}: Found ${eligibleRecords.length} records for sequence step ${i + 1} (target: ${key}, template: ${templateName})`);

            const contactsForTemplate = eligibleRecords.map(record => ({
              name: record.name || 'User',
              phone: record.phone,
            }));

            const recordIds = eligibleRecords.map(r => r.id);

            try {
              const result = await this.whatsappService.sendBulkTemplateMessageWithNames(
                contactsForTemplate,
                templateName,
                Number(tenant.userId) || 1
              );
              
              this.logger.log(`Tenant ${tenantId}: Sequence step ${i + 1} sent successfully.`);

              // Create success logs and update lastAutomationStep
              if (isContact) {
                const logsToCreate = eligibleRecords.map(record => ({
                  contactId: record.id,
                  templateName: templateName,
                  status: 'sent',
                  stepIndex: i + 1
                }));
                await client.contactAutomationLog.createMany({ data: logsToCreate });
                
                await client.contact.updateMany({
                  where: { id: { in: recordIds } },
                  data: {
                    isAutomationSent: true,
                    automationSentAt: new Date(),
                    lastAutomationStep: i + 1,
                  },
                });
              } else {
                const logsToCreate = eligibleRecords.map(record => ({
                  metaLeadId: record.id,
                  templateName: templateName,
                  status: 'sent',
                  stepIndex: i + 1
                }));
                await client.metaLeadAutomationLog.createMany({ data: logsToCreate });
                
                await client.metaLead.updateMany({
                  where: { id: { in: recordIds } },
                  data: {
                    isAutomationSent: true,
                    automationSentAt: new Date(),
                    lastAutomationStep: i + 1,
                  },
                });
              }

            } catch (err) {
              this.logger.error(`Tenant ${tenantId}: Failed to send template ${templateName}`, err);
              
              const errorMsg = err.message || String(err);
              if (isContact) {
                const logsToCreate = eligibleRecords.map(record => ({
                  contactId: record.id,
                  templateName: templateName,
                  status: 'failed',
                  error: errorMsg,
                  stepIndex: i + 1
                }));
                await client.contactAutomationLog.createMany({ data: logsToCreate });
                
                await client.contact.updateMany({
                  where: { id: { in: recordIds } },
                  data: {
                    lastAutomationStep: i + 1,
                  },
                });
              } else {
                const logsToCreate = eligibleRecords.map(record => ({
                  metaLeadId: record.id,
                  templateName: templateName,
                  status: 'failed',
                  error: errorMsg,
                  stepIndex: i + 1
                }));
                await client.metaLeadAutomationLog.createMany({ data: logsToCreate });
                
                await client.metaLead.updateMany({
                  where: { id: { in: recordIds } },
                  data: {
                    lastAutomationStep: i + 1,
                  },
                });
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing tenant ${tenantId} automation:`, error);
    }
  }
}
