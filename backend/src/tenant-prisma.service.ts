import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';

@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantPrismaService.name);

  // Store Prisma clients per tenant
  private clients: Map<string, TenantPrismaClient> = new Map();

  /**
   * Create a new Prisma client with connection pooling
   */
  private createClient(dbUrl: string): TenantPrismaClient {
    // Add connection pooling parameters to prevent connection exhaustion
    const urlWithPooling = dbUrl.includes('?') 
      ? `${dbUrl}&connection_limit=10&pool_timeout=20`
      : `${dbUrl}?connection_limit=10&pool_timeout=20`;

    const client = new TenantPrismaClient({
      datasources: {
        db: { url: urlWithPooling },
      },
      log: ['error', 'warn'],
    });

    return client;
  }

  /**
   * Get or create tenant Prisma client
   */
  getTenantClient(tenantId: string, dbUrl: string): TenantPrismaClient {
    // Normalize tenantId to ensure consistent caching
    const normalizedId = String(tenantId);
    
    if (!this.clients.has(normalizedId)) {
      this.logger.log(`🆕 Creating new Prisma client for tenant: ${normalizedId}`);
      const client = this.createClient(dbUrl);
      this.clients.set(normalizedId, client);
    } else {
      this.logger.debug(`♻️ Reusing existing Prisma client for tenant: ${normalizedId}`);
    }

    return this.clients.get(normalizedId)!;
  }

  /**
   * Execute query with retry (handles P1017 automatically)
   */
  async executeWithRetry<T>(
    tenantId: string,
    dbUrl: string,
    operation: (prisma: TenantPrismaClient) => Promise<T>,
    retries = 1,
  ): Promise<T> {
    try {
      const client = this.getTenantClient(tenantId, dbUrl);
      return await operation(client);
    } catch (error: any) {
      // 🔥 Handle Prisma connection error
      if (error.code === 'P1017' && retries > 0) {
        this.logger.warn(
          `⚠️ P1017 error for tenant ${tenantId} - reconnecting...`,
        );

        // ❌ Remove old client
        const oldClient = this.clients.get(tenantId);
        if (oldClient) {
          await oldClient.$disconnect();
          this.clients.delete(tenantId);
        }

        // 🔄 Create new client
        const newClient = this.createClient(dbUrl);
        this.clients.set(tenantId, newClient);

        // 🔁 Retry query
        return this.executeWithRetry(
          tenantId,
          dbUrl,
          operation,
          retries - 1,
        );
      }

      this.logger.error(`❌ Prisma error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Optional: Health check for DB connection
   */
  async checkConnection(tenantId: string, dbUrl: string): Promise<boolean> {
    try {
      const client = this.getTenantClient(tenantId, dbUrl);
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup all Prisma clients
   */
  async onModuleDestroy() {
    this.logger.log('🛑 Disconnecting all Prisma clients...');

    await Promise.all(
      Array.from(this.clients.values()).map((client) =>
        client.$disconnect(),
      ),
    );
  }
}