import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { LabelsGateway } from '../labels/labels.gateway';

@Module({
  controllers: [ContactController],
  providers: [ContactService, LabelsGateway],
  exports: [ContactService],
})
export class ContactModule {}
