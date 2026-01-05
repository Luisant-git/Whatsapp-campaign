import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SettingsModule } from './settings/settings.module';
import { AutoReplyModule } from './auto-reply/auto-reply.module';
import { QuickReplyModule } from './quick-reply/quick-reply.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { MasterConfigModule } from './master-config/master-config.module';
import { ContactModule } from './contact/contact.module';
import { AdminModule } from './admin/admin.module';
import { SubscriptionModule } from './subscription/subscription.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AdminModule,
    UserModule,
    WhatsappModule,
    AnalyticsModule,
    SettingsModule,
    AutoReplyModule,
    QuickReplyModule,
    ChatbotModule,
    MasterConfigModule,
    ContactModule,
    SubscriptionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
