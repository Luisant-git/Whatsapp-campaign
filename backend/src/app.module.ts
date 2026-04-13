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
// import { DomainTenantMiddleware } from './tenant/domain-tenant.middleware';
import { TestController } from './test.controller';
import { EcommerceModule } from './ecommerce/ecommerce.module';
import { MenuPermissionModule } from './menu-permission/menu-permission.module';
import { AdminAnalyticsModule } from './admin-analytics/admin-analytics.module';
import { MetaFlowModule } from './meta-flow/meta-flow.module';
import { FlowMessageModule } from './flow-message/flow-message.module';
import { FlowAppointmentModule } from './flow-appointment/flow-appointment.module';
import { CustomerDetailsFlowModule } from './customer-details-flow/customer-details-flow.module';
import { SubuserMenuPermissionModule } from './subuser-menu-permission/subuser-menu-permission.module';
import { CronModule } from './cron/cron.module';
import { RunDailyAutomationModule } from './run-daily-automation/run-daily-automation.module';
import { TemplateModule } from './template/template.module';
import { UploadModule } from './upload/upload.module';
import { TenentnoteModule } from './tenentnote/tenentnote.module';
import { MetaLeadsModule } from './meta-leads/meta-leads.module';
import { LandingContactModule } from './landing-contact/landing-contact.module';

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
    CustomerDetailsFlowModule,
    SubuserMenuPermissionModule,
   
    RunDailyAutomationModule,
    TemplateModule,
    UploadModule,
    TenentnoteModule,
    MetaLeadsModule,
    LandingContactModule,
  ],
  controllers: [AppController, TestController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      // .apply(DomainTenantMiddleware)
      .exclude(
        { path: 'admin/*path', method: RequestMethod.ALL },
        { path: 'user/login', method: RequestMethod.ALL },
        { path: 'user/register', method: RequestMethod.ALL },
        { path: 'subscription', method: RequestMethod.ALL },
        { path: 'subscription/*path', method: RequestMethod.ALL },
        { path: 'test/*path', method: RequestMethod.ALL },
        { path: 'whatsapp/webhook', method: RequestMethod.ALL },
        { path: 'whatsapp/webhook/*path', method: RequestMethod.ALL },
        { path: 'webhooks/*path', method: RequestMethod.ALL },
        { path: 'meta/flows', method: RequestMethod.ALL },
        { path: 'meta/flows/*path', method: RequestMethod.ALL },
        { path: 'menu-permission/*path', method: RequestMethod.ALL },
        { path: 'menu-permission', method: RequestMethod.ALL },
        { path: 'customer-details-flow', method: RequestMethod.ALL },
        { path: 'customer-details-flow/*path', method: RequestMethod.ALL },
        { path: 'flow-appointments/exchange', method: RequestMethod.ALL },
        { path: 'flow-appointments/:id/finish', method: RequestMethod.ALL },
        { path: 'meta-leads/webhook', method: RequestMethod.ALL },
        { path: 'landing-contact/submit', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
