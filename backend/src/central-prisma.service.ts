import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient as CentralPrismaClient } from '@prisma/client-central';

@Injectable()
export class CentralPrismaService
  extends CentralPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CentralPrismaService.name);

  private readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private rejectReady!: (err: unknown) => void;

  private isReconnecting = false;

  constructor() {
    super({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.CENTRAL_DATABASE_URL,
        },
      },
    });

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    // 🔥 Global Prisma crash handler
    (this as any).$on('error', async (e: any) => {
      this.logger.error('🔥 Prisma global error:', e);

      this.readyPromise = new Promise<void>((resolve, reject) => {
        this.resolveReady = resolve;
        this.rejectReady = reject;
      });

      try {
        await this.$disconnect();
        await this.delay(1500);
        await this.connectAndVerify();
      } catch (err) {
        this.logger.error('❌ Global recovery failed:', err);
      }
    });
  }

  async onModuleInit() {
    await this.connectAndVerify();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // ✅ Utility delay
  private async delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  /**
   * Connect and verify DB readiness using SELECT 1
   */
  private async connectAndVerify(
    maxPingAttempts = 20,
    pingIntervalMs = 500,
  ): Promise<void> {
    try {
      await this.$connect();
    } catch (err) {
      this.logger.error('❌ Central DB $connect() failed:', err);
      this.rejectReady(err);
      throw err;
    }

    for (let attempt = 1; attempt <= maxPingAttempts; attempt++) {
      try {
        await this.$queryRaw`SELECT 1`;
        this.logger.log('✅ Central database ready');

        this.resolveReady();
        return;
      } catch (pingErr: any) {
        const notReady =
          pingErr?.message?.includes('Engine is not yet connected') ||
          pingErr?.message?.includes('engine is not yet connected');

        if (notReady) {
          this.logger.warn(
            `⏳ DB ping ${attempt}/${maxPingAttempts} — waiting ${pingIntervalMs}ms...`,
          );
          await this.delay(pingIntervalMs);
        } else {
          this.logger.error('❌ DB ping failed:', pingErr);
          this.rejectReady(pingErr);
          throw pingErr;
        }
      }
    }

    const timeout = new Error(
      `DB not ready after ${maxPingAttempts} attempts`,
    );
    this.logger.error(`❌ ${timeout.message}`);
    this.rejectReady(timeout);
    throw timeout;
  }

  /**
   * Execute DB query with retry & auto-reconnect
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
          `⚠️ Engine not ready — waiting... (${retries} retries left)`,
        );
        await this.readyPromise;
        return this.executeWithRetry(operation, retries - 1);
      }

      // 🔥 Detect ALL connection failures
      const isConnectionTerminated =
        error?.message?.includes(
          'terminating connection due to administrator command',
        ) ||
        error?.message?.includes('Connection terminated unexpectedly') ||
        error?.message?.includes('connection was closed') ||
        error?.message?.includes('ECONNRESET') ||
        error?.code === '57P01' || // PostgreSQL shutdown
        error?.code === 'P1017' || // Prisma closed connection
        error?.code === 'P2024' || // pool timeout
        error?.code === 'P1001'; // DB unreachable

      if (isConnectionTerminated && retries > 0) {
        if (this.isReconnecting) {
          this.logger.warn('⏳ Waiting for ongoing reconnect...');
          await this.readyPromise;
          return this.executeWithRetry(operation, retries - 1);
        }

        this.isReconnecting = true;

        this.logger.warn(
          `⚠️ DB connection lost — reconnecting... (${retries} retries left)`,
        );

        this.readyPromise = new Promise<void>((resolve, reject) => {
          this.resolveReady = resolve;
          this.rejectReady = reject;
        });

        try {
          await this.$disconnect();
          await this.delay(1500);

          await this.connectAndVerify();

          this.logger.log('🔄 DB reconnected successfully');
          this.isReconnecting = false;

          return await operation(this);
        } catch (reconnectError) {
          this.isReconnecting = false;
          this.logger.error('❌ Reconnect failed:', reconnectError);
          throw reconnectError;
        }
      }

      throw error;
    }
  }
}
