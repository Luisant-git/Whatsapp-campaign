import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client-central';
import { TenantPrismaService } from './tenant-prisma.service';

const IST_OFFSET_MIN = 330;
function getIstMonthDay(date = new Date()) {
  const istMs = date.getTime() + IST_OFFSET_MIN * 60 * 1000;
  const ist = new Date(istMs);
  return { month: ist.getUTCMonth() + 1, day: ist.getUTCDate() };
}

@Injectable()
export class CronService {
  private centralPrisma = new PrismaClient();

  constructor(private tenantPrisma: TenantPrismaService) {}

  @Cron('*/30 * * * * *', { timeZone: 'Asia/Kolkata' })
  async handleCron() {
    const tenants = await this.centralPrisma.tenant.findMany({
      where: { isActive: true },
    });

    for (const tenant of tenants) {
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

      const contacts = await tenantClient.contact.findMany({
        where: { isActive: true },
        select: { id: true, name: true, dob: true, anniversary: true },
      });

      const todayMD = getIstMonthDay(new Date());
      const reminderMD = getIstMonthDay(new Date(Date.now() + 7 * 86400000)); // ✅ +7 days

      for (const c of contacts) {
        if (c.dob) {
          const dobMD = getIstMonthDay(new Date(c.dob));
          if (dobMD.month === reminderMD.month && dobMD.day === reminderMD.day) {
            console.log(`DOB reminder (+7) → ${c.name}`);
          }
          if (dobMD.month === todayMD.month && dobMD.day === todayMD.day) {
            console.log(`DOB today → ${c.name}`);
          }
        }

        if (c.anniversary) {
          const annMD = getIstMonthDay(new Date(c.anniversary));
          if (annMD.month === reminderMD.month && annMD.day === reminderMD.day) {
            console.log(`ANN reminder (+7) → ${c.name}`);
          }
          if (annMD.month === todayMD.month && annMD.day === todayMD.day) {
            console.log(`ANN today → ${c.name}`);
          }
        }
      }
    }
  }
}