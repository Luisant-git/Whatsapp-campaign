import { Module } from '@nestjs/common';
import { MetaCredentialService } from './meta-credential.service';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  providers: [MetaCredentialService, CentralPrismaService],
  exports: [MetaCredentialService],
})
export class MetaCredentialModule {}
