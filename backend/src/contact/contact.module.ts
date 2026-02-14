import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { TenantPrismaService } from '../tenant-prisma.service';
import { LabelsGateway } from '../labels/labels.gateway';

@Module({
  controllers: [ContactController],
  providers: [ContactService, TenantPrismaService, LabelsGateway],
  exports: [ContactService],
})
export class ContactModule {}
