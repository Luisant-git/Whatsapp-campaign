import { Module } from '@nestjs/common';
import { MetaCredentialService } from './meta-credential.service';

@Module({
  providers: [MetaCredentialService],
  exports: [MetaCredentialService],
})
export class MetaCredentialModule {}
