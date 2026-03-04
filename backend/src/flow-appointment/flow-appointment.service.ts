import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class FlowAppointmentService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {}

  async saveAppointment(data: any, userId: number) {
    const prisma = await this.getTenantClient(userId);
    return (prisma as any).flowAppointment.create({
      data: {
        department: data.department,
        location: data.location,
        date: data.date,
        time: data.time,
        name: data.name,
        email: data.email,
        phone: data.phone,
        moreDetails: data.more_details,
      },
    });
  }

  async getAppointments(userId: number) {
    const prisma = await this.getTenantClient(userId);
    return (prisma as any).flowAppointment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getTenantClient(userId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: userId } });
    if (!tenant) throw new Error('Tenant not found');
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    return this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
  }
}
