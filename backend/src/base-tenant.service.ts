import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';
import { CentralPrismaService } from './central-prisma.service';

@Injectable()
export class BaseTenantService {
  private readonly tenantUrlCache = new Map<number, { dbUrl: string; expiresAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    protected tenantPrisma: TenantPrismaService,
    protected centralPrisma: CentralPrismaService,
  ) {}

  protected async getTenantDb(userId: number) {
    const cached = this.tenantUrlCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      return this.tenantPrisma.getTenantClient(userId.toString(), cached.dbUrl);
    }

    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: userId },
    });
    if (!tenant) throw new Error('Tenant not found');

    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    this.tenantUrlCache.set(userId, { dbUrl, expiresAt: Date.now() + this.CACHE_TTL });

    return this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
  }
}
