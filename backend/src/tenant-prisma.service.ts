import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';

@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  private clients: Map<string, TenantPrismaClient> = new Map();

  getTenantClient(tenantId: string, dbUrl: string): TenantPrismaClient {
    if (!this.clients.has(tenantId)) {
      const client = new TenantPrismaClient({
        datasources: { db: { url: dbUrl } },
      });
      this.clients.set(tenantId, client);
    }
    return this.clients.get(tenantId)!;
  }

  async onModuleDestroy() {
    await Promise.all(
      Array.from(this.clients.values()).map((client) => client.$disconnect()),
    );
  }
}
