import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';

@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantPrismaService.name);

  private clients: Map<string, TenantPrismaClient> = new Map();
  private initPromises: Map<string, Promise<TenantPrismaClient>> = new Map();
  private reconnecting: Map<string, Promise<TenantPrismaClient>> = new Map();
  private disconnectingClients: Set<TenantPrismaClient> = new Set();
  private disconnectTimers: Set<NodeJS.Timeout> = new Set();

  // Utility delay helper
  private delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  /**
   * Create Prisma client with pooling parameters configured.
   * Default pool is kept minimal (2 connections per tenant) to prevent
   * exhausting PostgreSQL's max_connections on shared databases.
   */
  private createClient(tenantId: string, dbUrl: string): TenantPrismaClient {
    const defaultPool = process.env.TENANT_DB_POOL_LIMIT || '2';
    const urlWithPooling = dbUrl.includes('connection_limit')
      ? dbUrl
      : dbUrl.includes('?')
        ? `${dbUrl}&connection_limit=${defaultPool}&pool_timeout=15`
        : `${dbUrl}?connection_limit=${defaultPool}&pool_timeout=15`;

    return new TenantPrismaClient({
      datasources: {
        db: { url: urlWithPooling },
      },
      log: ['error', 'warn'],
    });
  }

  /**
   * Initialize and verify a tenant client (single-flight per tenant).
   * Prevents duplicate client creation and concurrent initialization races.
   * Ensures failed connections are disconnected and cleaned up immediately.
   */
  private async initClient(
    tenantId: string,
    dbUrl: string,
    maxAttempts = 5,
  ): Promise<TenantPrismaClient> {
    const id = String(tenantId);

    // If an initialization is already in flight, wait for it
    const inFlight = this.initPromises.get(id);
    if (inFlight) {
      return inFlight;
    }

    // If already verified and in cache (and not currently initializing)
    const existingClient = this.clients.get(id);
    if (existingClient) {
      return existingClient;
    }

    // If a reconnect is currently running for this tenant, await that reconnect
    const inReconnect = this.reconnecting.get(id);
    if (inReconnect) {
      return inReconnect;
    }

    // Synchronously create and register client in cache before any async yield
    // so any concurrent call to getTenantClient() or getTenantClientReady()
    // immediately receives and shares this exact client instance.
    const client = this.createClient(id, dbUrl);
    this.clients.set(id, client);

    const initPromise = (async () => {
      this.logger.log(`🆕 Initializing Prisma client for tenant ${id}`);

      try {
        await client.$connect();

        let verified = false;
        let lastErr: any = null;
        for (let i = 1; i <= maxAttempts; i++) {
          try {
            await client.$queryRaw`SELECT 1`;
            verified = true;
            break;
          } catch (err: any) {
            lastErr = err;
            if (err?.message?.includes('Engine is not yet connected')) {
              await this.delay(300);
            } else {
              throw err;
            }
          }
        }

        if (!verified) {
          throw lastErr || new Error(`Tenant ${id} DB not ready after ${maxAttempts} attempts`);
        }

        this.logger.log(`✅ Tenant ${id} DB ready`);
        return client;
      } catch (err: any) {
        this.logger.error(`❌ Failed to connect tenant ${id}: ${err?.message || err}`);
        // Ensure failed client does not remain in pool or leak connections
        if (this.clients.get(id) === client) {
          this.clients.delete(id);
        }
        await client.$disconnect().catch(() => {});
        throw err;
      } finally {
        this.initPromises.delete(id);
      }
    })();

    this.initPromises.set(id, initPromise);
    return initPromise;
  }

  /**
   * Get or create tenant client (synchronous wrapper).
   * Reuses existing client from pool if available.
   * Concurrent calls with getTenantClientReady() share the exact same client instance
   * and will never create duplicate Prisma clients.
   */
  getTenantClient(tenantId: string, dbUrl: string): TenantPrismaClient {
    const id = String(tenantId);

    const existing = this.clients.get(id);
    if (existing && !this.disconnectingClients.has(existing)) {
      return existing;
    }

    // Trigger single-flight connection verification
    // initClient synchronously creates client and registers it in this.clients before any await
    this.initClient(id, dbUrl).catch((err) => {
      this.logger.error(`Background connect failed for tenant ${id}: ${err?.message || err}`);
    });

    return this.clients.get(id)!;
  }

  /**
   * Get tenant client and wait for it to be ready.
   * Awaits ongoing reconnects if present, ensuring it never returns a client being disconnected.
   */
  async getTenantClientReady(
    tenantId: string,
    dbUrl: string,
  ): Promise<TenantPrismaClient> {
    const id = String(tenantId);

    // If reconnect is currently in flight, await the verified reconnected client
    if (this.reconnecting.has(id)) {
      return await this.reconnecting.get(id)!;
    }

    return await this.initClient(id, dbUrl);
  }

  /**
   * Safe reconnect logic per tenant (single-flight mutex).
   * Creates and verifies new client first, then atomically swaps it.
   * Disconnects old client after a grace delay so in-flight queries are not aborted.
   */
  async reconnectTenant(
    tenantId: string,
    dbUrl: string,
  ): Promise<TenantPrismaClient> {
    const id = String(tenantId);

    if (this.reconnecting.has(id)) {
      this.logger.warn(`⏳ Waiting for ongoing reconnect for tenant ${id}`);
      return await this.reconnecting.get(id)!;
    }

    const reconnectPromise = (async () => {
      this.logger.warn(`⚠️ Reconnecting tenant DB: ${id}`);
      let lastErr: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        const newClient = this.createClient(id, dbUrl);
        try {
          if (attempt > 1) {
            await this.delay(1000 * attempt);
          }
          await newClient.$connect();
          await newClient.$queryRaw`SELECT 1`;

          // Atomic swap: replace in client cache
          const oldClient = this.clients.get(id);
          this.clients.set(id, newClient);

          // Gracefully disconnect old client after a delay to let active queries finish
          if (oldClient && oldClient !== newClient) {
            this.disconnectingClients.add(oldClient);
            const timer = setTimeout(async () => {
              this.disconnectTimers.delete(timer);
              this.disconnectingClients.delete(oldClient);
              await oldClient.$disconnect().catch(() => {});
            }, 5000);
            if (timer.unref) timer.unref();
            this.disconnectTimers.add(timer);
          }

          this.logger.log(`🔄 Tenant ${id} reconnected successfully (attempt ${attempt}/3)`);
          return newClient;
        } catch (err: any) {
          lastErr = err;
          await newClient.$disconnect().catch(() => {});
          this.logger.warn(`⏳ Tenant ${id} reconnect attempt ${attempt}/3 failed: ${err?.message || err}`);
        }
      }

      this.logger.error(`❌ Tenant ${id} reconnect failed completely: ${lastErr?.message || lastErr}`);
      throw lastErr;
    })().finally(() => {
      this.reconnecting.delete(id);
    });

    this.reconnecting.set(id, reconnectPromise);
    return await reconnectPromise;
  }

  /**
   * Execute query with retry on connection drop.
   */
  async executeWithRetry<T>(
    tenantId: string,
    dbUrl: string,
    operation: (prisma: TenantPrismaClient) => Promise<T>,
    retries = 2,
  ): Promise<T> {
    const id = String(tenantId);

    try {
      const client = await this.getTenantClientReady(id, dbUrl);
      return await operation(client);
    } catch (error: any) {
      const isConnectionError =
        error?.message?.includes('terminating connection due to administrator command') ||
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

        await this.reconnectTenant(id, dbUrl).catch(() => {});

        return this.executeWithRetry(
          id,
          dbUrl,
          operation,
          retries - 1,
        );
      }

      this.logger.error(`❌ Tenant ${id} Prisma error: ${error?.message || error}`);
      throw error;
    }
  }

  /**
   * Cleanup all tenant clients and pending connection promises on application shutdown.
   */
  async onModuleDestroy() {
    this.logger.log('🛑 Disconnecting all tenant Prisma clients...');

    // 1. Clear all active disconnect grace timers
    for (const timer of this.disconnectTimers) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();

    // 2. Await any in-flight initialization and reconnect promises (with 2s timeout) so no orphaned clients are left
    const inFlightPromises = [
      ...Array.from(this.initPromises.values()),
      ...Array.from(this.reconnecting.values()),
    ];
    if (inFlightPromises.length > 0) {
      await Promise.race([
        Promise.allSettled(inFlightPromises),
        this.delay(2000),
      ]);
    }

    // 3. Collect all clients (active + disconnecting)
    const allClients = new Set<TenantPrismaClient>([
      ...Array.from(this.clients.values()),
      ...Array.from(this.disconnectingClients),
    ]);

    this.clients.clear();
    this.disconnectingClients.clear();
    this.initPromises.clear();
    this.reconnecting.clear();

    // 4. Disconnect all clients in parallel
    await Promise.all(
      Array.from(allClients).map((client) => client.$disconnect().catch(() => {})),
    );
  }
}
