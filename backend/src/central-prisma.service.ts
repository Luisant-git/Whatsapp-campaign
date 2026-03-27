import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient as CentralPrismaClient } from '@prisma/client-central';

@Injectable()
export class CentralPrismaService
  extends CentralPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CentralPrismaService.name);
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;

  constructor() {
    super({
      log: ['error', 'warn'],
      // Add connection pooling
      datasources: {
        db: {
          url: process.env.CENTRAL_DATABASE_URL
        }
      }
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      await this.$connect();
      this.reconnectAttempts = 0;
      this.logger.log('✅ Central database connected');
    } catch (error) {
      this.logger.error(`❌ Central DB connection failed (attempt ${attempt}/${this.maxReconnectAttempts})`);
      
      if (attempt < this.maxReconnectAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this.connectWithRetry(attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Execute query with automatic reconnection on P1017 errors
   */
  async executeWithRetry<T>(
    operation: (prisma: CentralPrismaService) => Promise<T>,
    retries = 3
  ): Promise<T> {
    try {
      return await operation(this);
    } catch (error: any) {
      const isEngineNotReady =
        error?.message?.includes('Engine is not yet connected') ||
        error?.message?.includes('engine is not yet connected');

      // Handle P1017 (connection closed) OR "Engine not yet connected" (startup race)
      if ((error.code === 'P1017' || isEngineNotReady) && retries > 0) {
        this.logger.warn(
          `⚠️ Central DB not ready (${isEngineNotReady ? 'engine not connected' : 'P1017'}) — retrying in 500ms... (${retries} retries left)`
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        if (isEngineNotReady) {
          // Don't disconnect/reconnect — just wait and retry; $connect is already in flight
          return this.executeWithRetry(operation, retries - 1);
        }

        // P1017: force a full reconnect cycle
        try {
          await this.$disconnect();
          await this.$connect();
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
