import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, PrismaService, TenantPrismaService, CentralPrismaService],
  exports: [SettingsService]
})
export class SettingsModule {}