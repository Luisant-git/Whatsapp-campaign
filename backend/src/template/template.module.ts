import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { TemplateWebhookService } from './template-webhook.service';
import { CarouselValidatorService } from './carousel-validator.service';
import { MetaCarouselBuilderService } from './meta-carousel-builder.service';
import { MetaCredentialModule } from '../meta-credential/meta-credential.module';

@Module({
  imports: [MetaCredentialModule],
  controllers: [TemplateController],
  providers: [TemplateService, TemplateWebhookService, CarouselValidatorService, MetaCarouselBuilderService],
  exports: [TemplateService, TemplateWebhookService, CarouselValidatorService, MetaCarouselBuilderService],
})
export class TemplateModule {}