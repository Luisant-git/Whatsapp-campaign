import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { TemplateWebhookService } from './template-webhook.service';
import { CentralPrismaService } from '../central-prisma.service';

import { CarouselValidatorService } from './carousel-validator.service';
import { MetaCarouselBuilderService } from './meta-carousel-builder.service';

@Module({
  controllers: [TemplateController],
  providers: [TemplateService, TemplateWebhookService, CentralPrismaService, CarouselValidatorService, MetaCarouselBuilderService],
  exports: [TemplateService, TemplateWebhookService, CarouselValidatorService, MetaCarouselBuilderService],
})
export class TemplateModule {}