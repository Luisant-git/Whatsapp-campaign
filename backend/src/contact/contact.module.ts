import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { PrismaService } from '../prisma.service';
import { LabelsGateway } from '../labels/labels.gateway';

@Module({
  controllers: [ContactController],
  providers: [ContactService, PrismaService, LabelsGateway],
  exports: [ContactService],
})
export class ContactModule {}
