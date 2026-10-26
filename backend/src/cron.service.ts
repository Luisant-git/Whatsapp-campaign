import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CentralPrismaService } from './central-prisma.service';
import { TenantPrismaService } from './tenant-prisma.service';

const IST_OFFSET_MIN = 330;
function getIstMonthDay(date = new Date()) {
  const istMs = date.getTime() + IST_OFFSET_MIN * 60 * 1000;
  const ist = new Date(istMs);
  return { month: ist.getUTCMonth() + 1, day: ist.getUTCDate() };
}

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private isRunning = false;

  constructor(
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService,
  ) { }

  @Cron('*/30 * * * * *', { timeZone: 'Asia/Kolkata' })
  async handleCron() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      const tenants = await this.centralPrisma.tenant.findMany({
        where: { isActive: true },
      });

      for (const tenant of tenants) {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

          const contacts = await tenantClient.contact.findMany({
            where: { isActive: true },
            select: { id: true, name: true, dob: true, anniversary: true },
          });

          const todayMD = getIstMonthDay(new Date());
          const reminderMD = getIstMonthDay(new Date(Date.now() + 7 * 86400000)); // +7 days

          for (const c of contacts) {
            if (c.dob) {
              const dobMD = getIstMonthDay(new Date(c.dob));
              if (dobMD.month === reminderMD.month && dobMD.day === reminderMD.day) {
                // DOB reminder (+7)
              }
              if (dobMD.month === todayMD.month && dobMD.day === todayMD.day) {
                // DOB today
              }
            }

            if (c.anniversary) {
              const annMD = getIstMonthDay(new Date(c.anniversary));
              if (annMD.month === reminderMD.month && annMD.day === reminderMD.day) {
                // ANN reminder (+7)
              }
              if (annMD.month === todayMD.month && annMD.day === todayMD.day) {
                // ANN today
              }
            }
          }
        } catch (tenantErr: any) {
          this.logger.error(`Error in CronService for tenant ${tenant.id}:`, tenantErr?.message || tenantErr);
        }
      }
    } catch (err: any) {
      this.logger.error('Error in CronService handleCron:', err?.message || err);
    } finally {
      this.isRunning = false;
    }
  }
}