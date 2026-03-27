import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient as CentralPrismaClient } from '@prisma/client-central';

@Injectable()
export class CentralPrismaService
  extends CentralPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CentralPrismaService.name);
  private readonly maxReconnectAttempts = 3;

  /**
   * Holds the in-flight $connect() promise so that executeWithRetry can
   * await it directly instead of polling with fixed-delay retries.
   */
  private connectingPromise: Promise<void> | null = null;
  private connected = false;

  constructor() {
    super({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.CENTRAL_DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    this.connected = false;
    this.connectingPromise = null;
    await this.$disconnect();
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    this.connectingPromise = this.$connect()
      .then(() => {
        this.connected = true;
        this.connectingPromise = null;
        this.logger.log('✅ Central database connected');
      })
      .catch(async (error) => {
        this.connectingPromise = null;
        this.logger.error(
          `❌ Central DB connection failed (attempt ${attempt}/${this.maxReconnectAttempts})`,
        );
        if (attempt < this.maxReconnectAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          return this.connectWithRetry(attempt + 1);
        }
        throw error;
      });

    // Await so onModuleInit() blocks until truly connected (or gives up).
    await this.connectingPromise;
  }

  /**
   * Execute query with automatic reconnection on P1017 errors.
   *
   * For "Engine is not yet connected" errors we await the in-flight
   * connectingPromise directly rather than polling with fixed delays.
   * This removes the race condition where retries were exhausted before
   * $connect() had a chance to finish.
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
        if (this.connectingPromise) {
          // Wait for the actual $connect() to finish — no guessing on timing.
          this.logger.warn(
            `⚠️ Central DB engine not ready — awaiting in-flight connect... (${retries} retries left)`,
          );
          await this.connectingPromise;
        } else {
          // $connect already resolved (or was never stored). Give it a brief
          // moment in case something is still wiring up internally.
          this.logger.warn(
            `⚠️ Central DB engine not ready — waiting 200ms... (${retries} retries left)`,
          );
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return this.executeWithRetry(operation, retries - 1);
      }

      if (error.code === 'P1017' && retries > 0) {
        this.logger.warn(
          `⚠️ Central DB connection closed (P1017) — reconnecting... (${retries} retries left)`,
        );
        try {
          await this.$disconnect();
          await this.$connect();
          this.connected = true;
          this.logger.log('🔄 Central DB reconnected');
          return await operation(this);
        } catch (reconnectError) {
          this.logger.error('❌ Failed to reconnect central DB:', reconnectError);
          throw error;
        }
      }

      throw error;
    }
  }
}
