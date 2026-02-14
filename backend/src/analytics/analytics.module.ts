import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { TenantPrismaService } from '../tenant-prisma.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, TenantPrismaService],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}