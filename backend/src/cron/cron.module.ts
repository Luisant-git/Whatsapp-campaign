import { Module } from '@nestjs/common';
import { AutomationCronService } from './automation-cron.service';
import { AutoTemplateSenderService } from './auto-template-sender.service';

@Module({
  providers: [AutomationCronService, AutoTemplateSenderService],
})
export class CronModule {}