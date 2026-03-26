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
    retries = 1
  ): Promise<T> {
    try {
      return await operation(this);
    } catch (error: any) {
      // Handle P1017 (connection closed) error
      if (error.code === 'P1017' && retries > 0) {
        this.logger.warn('⚠️ P1017 error on central DB - reconnecting...');
        
        try {
          await this.$disconnect();
          await this.$connect();
          this.logger.log('🔄 Central DB reconnected');
          
          // Retry the operation
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
