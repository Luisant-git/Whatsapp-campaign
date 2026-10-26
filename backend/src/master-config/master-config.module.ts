import { Module } from '@nestjs/common';
import { MasterConfigController } from './master-config.controller';
import { MasterConfigService } from './master-config.service';
import { MetaCredentialModule } from '../meta-credential/meta-credential.module';

@Module({
  imports: [MetaCredentialModule],
  controllers: [MasterConfigController],
  providers: [MasterConfigService],
  exports: [MasterConfigService],
})
export class MasterConfigModule {}