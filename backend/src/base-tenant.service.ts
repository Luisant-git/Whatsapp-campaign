import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';
import { CentralPrismaService } from './central-prisma.service';

@Injectable()
export class BaseTenantService {
  constructor(
    protected tenantPrisma: TenantPrismaService,
    protected centralPrisma: CentralPrismaService,
  ) {}

  protected async getTenantDb(userId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: userId },
    });
    if (!tenant) throw new Error('Tenant not found');
    
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    return this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
  }
}
