import { Module } from '@nestjs/common';
import { AutomationCronService } from './automation-cron.service';
import { AutoTemplateSenderService } from './auto-template-sender.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  providers: [AutomationCronService, AutoTemplateSenderService],
})
export class CronModule { }
