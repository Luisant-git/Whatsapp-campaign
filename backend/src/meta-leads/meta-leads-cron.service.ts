import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient as CentralPrismaClient } from '@prisma/client-central';
import { TenantPrismaService } from '../tenant-prisma.service';
import { MetaLeadsService } from './meta-leads.service';
import { MetaConfigService } from './meta-config.service';

@Injectable()
export class MetaLeadsCronService {
  private readonly logger = new Logger(MetaLeadsCronService.name);
  private centralPrisma = new CentralPrismaClient();

  constructor(
    private tenantPrisma: TenantPrismaService,
    private metaLeadsService: MetaLeadsService,
    private metaConfigService: MetaConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Asia/Kolkata' })
  async handleDailyMetaSync() {
    this.logger.log('Starting daily Meta Leads sync...');

    try {
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true },
      });

      for (const tenant of tenants) {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          const tenantIdStr = tenant.id.toString();

          this.logger.log(`Checking Meta config for tenant ${tenantIdStr} (${tenant.name})`);

          // Get active MetaConfig
          const metaConfig = await this.metaConfigService.getActive(tenantIdStr, dbUrl);
          
          if (!metaConfig || !metaConfig.accessToken || !metaConfig.pageId) {
            this.logger.log(`Skipping tenant ${tenantIdStr}: No active MetaConfig with pageId and accessToken.`);
            continue;
          }

          // Get MasterConfig for phoneNumberId
          const masterConfig = await this.metaLeadsService.getMasterConfig(tenantIdStr, dbUrl);
          const phoneNumberId = masterConfig?.phoneNumberId;

          this.logger.log(`Syncing leads for tenant ${tenantIdStr}, pageId: ${metaConfig.pageId}`);

          await this.metaLeadsService.syncLeadsFromFacebook(
            metaConfig.pageId,
            'all',
            metaConfig.accessToken,
            phoneNumberId,
            tenantIdStr,
            dbUrl,
            undefined // since
          );

          this.logger.log(`Successfully completed Meta Leads sync for tenant ${tenantIdStr}`);
        } catch (error) {
          this.logger.error(`Error syncing leads for tenant ${tenant.id}:`, error);
        }
      }

      this.logger.log('Finished daily Meta Leads sync for all active tenants.');
    } catch (error) {
      this.logger.error('Error during daily Meta Leads sync cron job:', error);
    }
  }
}
