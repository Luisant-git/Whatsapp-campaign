import { Module } from '@nestjs/common';
import { MasterConfigController } from './master-config.controller';
import { MasterConfigService } from './master-config.service';
import { TenantPrismaService } from '../tenant-prisma.service';

@Module({
  controllers: [MasterConfigController],
  providers: [MasterConfigService, TenantPrismaService],
  exports: [MasterConfigService],
})
export class MasterConfigModule {}