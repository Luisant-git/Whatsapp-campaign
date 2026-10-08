import { Module } from '@nestjs/common';
import { MasterConfigController } from './master-config.controller';
import { MasterConfigService } from './master-config.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { MetaCredentialModule } from '../meta-credential/meta-credential.module';

@Module({
  imports: [MetaCredentialModule],
  controllers: [MasterConfigController],
  providers: [MasterConfigService, TenantPrismaService, CentralPrismaService],
  exports: [MasterConfigService],
})
export class MasterConfigModule {}