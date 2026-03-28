import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';

@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantPrismaService.name);

  private clients: Map<string, TenantPrismaClient> = new Map();
  private reconnecting: Map<string, boolean> = new Map();
  private readyPromises: Map<string, Promise<void>> = new Map();
  private resolveMap: Map<string, () => void> = new Map();
  private rejectMap: Map<string, (err: unknown) => void> = new Map();

  // ✅ Delay helper
  private delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  /**
   * Create Prisma client with pooling
   */
  private createClient(tenantId: string, dbUrl: string): TenantPrismaClient {
    const urlWithPooling = dbUrl.includes('?')
      ? `${dbUrl}&connection_limit=10&pool_timeout=20`
      : `${dbUrl}?connection_limit=10&pool_timeout=20`;

    const client = new TenantPrismaClient({
      datasources: {
        db: { url: urlWithPooling },
      },
      log: ['error', 'warn'],
    });

    // 🔥 Global error recovery per tenant
    client.$on('error', async (e) => {
      this.logger.error(`🔥 Prisma error (tenant ${tenantId}):`, e);
      await this.reconnectTenant(tenantId, dbUrl);
    });

    return client;
  }

  /**
   * Ensure readiness (SELECT 1)
   */
  private async connectAndVerify(
    tenantId: string,
    client: TenantPrismaClient,
    maxAttempts = 10,
  ) {
    this.readyPromises.set(
      tenantId,
      new Promise((resolve, reject) => {
        this.resolveMap.set(tenantId, resolve);
        this.rejectMap.set(tenantId, reject);
      }),
    );

    try {
      await client.$connect();
    } catch (err) {
      this.rejectMap.get(tenantId)?.(err);
      throw err;
    }

    for (let i = 1; i <= maxAttempts; i++) {
      try {
        await client.$queryRaw`SELECT 1`;
        this.resolveMap.get(tenantId)?.();
        this.logger.log(`✅ Tenant ${tenantId} DB ready`);
        return;
      } catch (err: any) {
        if (err?.message?.includes('Engine is not yet connected')) {
          this.logger.warn(`⏳ Tenant ${tenantId} waiting for DB...`);
          await this.delay(300);
        } else {
          this.rejectMap.get(tenantId)?.(err);
          throw err;
        }
      }
    }

    const timeout = new Error(`Tenant ${tenantId} DB not ready`);
    this.rejectMap.get(tenantId)?.(timeout);
    throw timeout;
  }

  /**
   * Get or create tenant client
   */
  getTenantClient(
    tenantId: string,
    dbUrl: string,
  ): TenantPrismaClient {
    const id = String(tenantId);

    if (!this.clients.has(id)) {
      this.logger.log(`🆕 Creating Prisma client for tenant ${id}`);

      const client = this.createClient(id, dbUrl);
      this.clients.set(id, client);

      this.connectAndVerify(id, client);
    }

    return this.clients.get(id)!;
  }

  /**
   * 🔥 Full reconnect logic per tenant
   */
  private async reconnectTenant(tenantId: string, dbUrl: string) {
    const id = String(tenantId);

    if (this.reconnecting.get(id)) {
      this.logger.warn(`⏳ Tenant ${id} already reconnecting...`);
      await this.readyPromises.get(id);
      return;
    }

    this.reconnecting.set(id, true);

    this.logger.warn(`⚠️ Reconnecting tenant DB: ${id}`);

    try {
      const oldClient = this.clients.get(id);
      if (oldClient) {
        await oldClient.$disconnect();
        this.clients.delete(id);
      }

      await this.delay(1000);

      const newClient = this.createClient(id, dbUrl);
      this.clients.set(id, newClient);

      await this.connectAndVerify(id, newClient);

      this.logger.log(`🔄 Tenant ${id} reconnected successfully`);
    } catch (err) {
      this.logger.error(`❌ Tenant ${id} reconnect failed`, err);
      throw err;
    } finally {
      this.reconnecting.set(id, false);
    }
  }

  /**
   * Execute query with retry
   */
  async executeWithRetry<T>(
    tenantId: string,
    dbUrl: string,
    operation: (prisma: TenantPrismaClient) => Promise<T>,
    retries = 2,
  ): Promise<T> {
    const id = String(tenantId);

    try {
      const client = await this.getTenantClient(id, dbUrl);
      return await operation(client);
    } catch (error: any) {
      const isConnectionError =
        error?.message?.includes(
          'terminating connection due to administrator command',
        ) ||
        error?.message?.includes('connection was closed') ||
        error?.message?.includes('ECONNRESET') ||
        error?.code === '57P01' ||
        error?.code === 'P1017' ||
        error?.code === 'P2024' ||
        error?.code === 'P1001';

      if (isConnectionError && retries > 0) {
        this.logger.warn(
          `⚠️ Tenant ${id} DB error — reconnecting (${retries} retries left)`,
        );

        await this.reconnectTenant(id, dbUrl);

        return this.executeWithRetry(
          id,
          dbUrl,
          operation,
          retries - 1,
        );
      }

      this.logger.error(`❌ Tenant ${id} Prisma error:`, error);
      throw error;
    }
  }

  /**
   * Cleanup
   */
  async onModuleDestroy() {
    this.logger.log('🛑 Disconnecting all tenant Prisma clients...');

    await Promise.all(
      Array.from(this.clients.values()).map((client) =>
        client.$disconnect(),
      ),
    );
  }
}

