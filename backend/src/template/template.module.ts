import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { TemplateWebhookService } from './template-webhook.service';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  controllers: [TemplateController],
  providers: [TemplateService, TemplateWebhookService, CentralPrismaService],
  exports: [TemplateService, TemplateWebhookService],
})
export class TemplateModule {}