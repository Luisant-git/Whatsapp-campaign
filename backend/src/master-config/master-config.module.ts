import { Module } from '@nestjs/common';
import { MasterConfigController } from './master-config.controller';
import { MasterConfigService } from './master-config.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [MasterConfigController],
  providers: [MasterConfigService, PrismaService],
  exports: [MasterConfigService],
})
export class MasterConfigModule {}