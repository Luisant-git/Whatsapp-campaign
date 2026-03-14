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
import { MenuPermissionModule } from './menu-permission/menu-permission.module';
import { AdminAnalyticsModule } from './admin-analytics/admin-analytics.module';
import { MetaFlowModule } from './meta-flow/meta-flow.module';
import { FlowMessageModule } from './flow-message/flow-message.module';
import { FlowAppointmentModule } from './flow-appointment/flow-appointment.module';
import { SubuserMenuPermissionModule } from './subuser-menu-permission/subuser-menu-permission.module';
import { CronModule } from './cron/cron.module';
import { RunDailyAutomationModule } from './run-daily-automation/run-daily-automation.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CronModule,
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
   
   
   
    MenuPermissionModule,
   
    AdminAnalyticsModule,
    MetaFlowModule,
    FlowMessageModule,
    FlowAppointmentModule,
    SubuserMenuPermissionModule,
   
    RunDailyAutomationModule,
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
        'webhooks/(.*)',
        'meta/flows',
        'menu-permission/(.*)',  
        'menu-permission',  
        
          
      )
      .forRoutes('*');
  }
}
