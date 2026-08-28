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

      // Fetch active automation rules
      const activeRules = await client.metaLeadAutomation.findMany({
        where: { isActive: true },
      });

      if (!activeRules.length) return;

      // Find leads that haven't received automation yet
      const pendingLeads = await client.metaLead.findMany({
        where: {
          isAutomationSent: false,
          phone: { not: null },
        },
      });

      if (!pendingLeads.length) return;

      const now = new Date();

      for (const rule of activeRules) {
        const templateName = rule.templateName;
        const delayMs = rule.delayMinutes * 60 * 1000;

        // Filter leads for this rule
        const eligibleLeads = pendingLeads.filter(lead => {
          const createdTime = lead.createdAt.getTime();
          // If the time passed since creation is greater than or equal to delay
          return (now.getTime() - createdTime) >= delayMs;
        });

        if (eligibleLeads.length > 0) {
          this.logger.log(`Tenant ${tenantId}: Found ${eligibleLeads.length} leads for automation rule (template: ${templateName})`);

          // We need settingsId to send. Let's find default WhatsApp settings
          const defaultSettings = await client.whatsAppSettings.findFirst({
            where: { isDefault: true },
          });

          if (!defaultSettings) {
            this.logger.warn(`Tenant ${tenantId} has no default WhatsApp settings. Cannot send automation.`);
            continue;
          }

          // Format contacts for sendBulkTemplateMessageWithNames
          const contactsForTemplate = eligibleLeads.map(lead => ({
            name: lead.name || 'User',
            phone: lead.phone,
          }));

          // Send template
          try {
             const result = await this.whatsappService.sendBulkTemplateMessageWithNames(
                contactsForTemplate,
                templateName,
                Number(tenant.userId) || 1, 
                defaultSettings.id
             );
             
             this.logger.log(`Tenant ${tenantId}: Automation sent successfully. Result: ${JSON.stringify(result)}`);

             // Mark leads as sent
             const leadIds = eligibleLeads.map(l => l.id);
             await client.metaLead.updateMany({
               where: { id: { in: leadIds } },
               data: {
                 isAutomationSent: true,
                 automationSentAt: new Date(),
               },
             });

             // We remove processed leads from pending array so other rules don't process them again
             for(const lId of leadIds) {
               const idx = pendingLeads.findIndex(p => p.id === lId);
               if(idx > -1) pendingLeads.splice(idx, 1);
             }

          } catch (err) {
             this.logger.error(`Tenant ${tenantId}: Failed to send template ${templateName}`, err);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing tenant ${tenantId} automation:`, error);
    }
  }
}
