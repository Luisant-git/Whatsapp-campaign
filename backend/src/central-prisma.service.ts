import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient as CentralPrismaClient } from '@prisma/client-central';

@Injectable()
export class CentralPrismaService
  extends CentralPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CentralPrismaService.name);

  /**
   * This promise resolves only after a real SELECT 1 ping succeeds.
   * $connect() resolves its promise before the query engine binary is fully
   * ready, so we cannot use it as a readiness signal. Instead, callers that
   * hit "Engine is not yet connected" await this promise, which guarantees
   * the DB is actually queryable before the retry fires.
   */
  private readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private rejectReady!: (err: unknown) => void;

  constructor() {
    super({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.CENTRAL_DATABASE_URL,
        },
      },
      // Connection pool configuration
      connectionLimit: 10,
      poolTimeout: 30,
      transactionOptions: {
        maxWait: 5000,
        timeout: 10000,
      },
    });
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
  }

  async onModuleInit() {
    await this.connectAndVerify();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Calls $connect() and then polls with SELECT 1 until the engine is genuinely
   * ready to accept queries, then resolves `readyPromise`.
   * Any in-flight executeWithRetry call that hit "Engine is not yet connected"
   * is awaiting `readyPromise` and will unblock the instant this resolves.
   */
  private async connectAndVerify(maxPingAttempts = 20, pingIntervalMs = 500): Promise<void> {
    try {
      await this.$connect();
    } catch (err) {
      this.logger.error('❌ Central DB $connect() failed:', err);
      this.rejectReady(err);
      throw err;
    }

    // $connect() resolved but the engine binary may still be initialising.
    // Run real pings until one succeeds.
    for (let attempt = 1; attempt <= maxPingAttempts; attempt++) {
      try {
        await this.$queryRaw`SELECT 1`;
        this.logger.log('✅ Central database ready (ping succeeded)');
        this.resolveReady(); // unblock all awaiting executeWithRetry calls
        return;
      } catch (pingErr: any) {
        const notReady =
          pingErr?.message?.includes('Engine is not yet connected') ||
          pingErr?.message?.includes('engine is not yet connected');

        if (notReady) {
          this.logger.warn(
            `⏳ Central DB ping ${attempt}/${maxPingAttempts} — engine not ready yet, waiting ${pingIntervalMs}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, pingIntervalMs));
        } else {
          // Real DB error (bad credentials, DB down, etc.) — give up immediately.
          this.logger.error('❌ Central DB ping failed with unexpected error:', pingErr);
          this.rejectReady(pingErr);
          throw pingErr;
        }
      }
    }

    const timeout = new Error(
      `Central DB engine still not ready after ${maxPingAttempts} ping attempts`,
    );
    this.logger.error(`❌ ${timeout.message}`);
    this.rejectReady(timeout);
    throw timeout;
  }

  /**
   * Execute query with automatic reconnection.
   *
   * "Engine is not yet connected" → await `readyPromise` (which only resolves
   *   once a real ping has succeeded) then retry. No fixed-delay polling.
   *
   * P1017 (connection closed at runtime) → full disconnect/reconnect cycle.
   */
  async executeWithRetry<T>(
    operation: (prisma: CentralPrismaService) => Promise<T>,
    retries = 3,
  ): Promise<T> {
    try {
      return await operation(this);
    } catch (error: any) {
      const isEngineNotReady =
        error?.message?.includes('Engine is not yet connected') ||
        error?.message?.includes('engine is not yet connected');

      if (isEngineNotReady && retries > 0) {
        this.logger.warn(
          `⚠️ Central DB engine not ready — awaiting readiness signal... (${retries} retries left)`,
        );
        // Block until connectAndVerify() has confirmed a successful ping.
        await this.readyPromise;
        return this.executeWithRetry(operation, retries - 1);
      }

      if (error.code === 'P1017' && retries > 0) {
        this.logger.warn(
          `⚠️ Central DB connection closed (P1017) — reconnecting... (${retries} retries left)`,
        );
        // Reset readyPromise so any concurrent callers also wait.
        this.readyPromise = new Promise<void>((resolve, reject) => {
          this.resolveReady = resolve;
          this.rejectReady = reject;
        });
        try {
          await this.$disconnect();
          await this.connectAndVerify();
          this.logger.log('🔄 Central DB reconnected');
          return await operation(this);
        } catch (reconnectError) {
          this.logger.error('❌ Failed to reconnect central DB:', reconnectError);
          throw reconnectError;
        }
      }

      // Handle PostgreSQL connection termination (57P01)
      const isConnectionTerminated =
        error?.message?.includes('terminating connection due to administrator command') ||
        error?.message?.includes('connection was closed') ||
        error?.code === 'P2024' || // Timed out fetching a new connection
        error?.code === 'P1001'; // Can't reach database server

      if (isConnectionTerminated && retries > 0) {
        this.logger.warn(
          `⚠️ Central DB connection terminated — reconnecting... (${retries} retries left)`,
        );
        this.readyPromise = new Promise<void>((resolve, reject) => {
          this.resolveReady = resolve;
          this.rejectReady = reject;
        });
        try {
          await this.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before reconnect
          await this.connectAndVerify();
          this.logger.log('🔄 Central DB reconnected after termination');
          return await operation(this);
        } catch (reconnectError) {
          this.logger.error('❌ Failed to reconnect after termination:', reconnectError);
          throw reconnectError;
        }
      }

      throw error;
    }
  }
}
