import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SettingsModule } from './settings/settings.module';
import { AutoReplyModule } from './auto-reply.module';
import { ChatbotModule } from './chatbot/chatbot.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UserModule, 
    WhatsappModule, 
    AnalyticsModule, 
    SettingsModule, 
    AutoReplyModule,
    ChatbotModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
