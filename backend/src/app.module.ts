import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
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
import { GroupModule } from './group/group.module';
import { TenantModule } from './tenant/tenant.module';
import { TestModule } from './test/test.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { TestController } from './test.controller';
import { EcommerceModule } from './ecommerce/ecommerce.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TenantModule,
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
    GroupModule,
    TestModule,
    EcommerceModule,
  ],
  controllers: [AppController, TestController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        'admin/(.*)',
        'user/login',
        'user/register',
        'subscription',
        'subscription/(.*)',
        'test/(.*)',
        'whatsapp/webhook',
        'whatsapp/webhook/(.*)',
      )
      .forRoutes('*');
  }
}
