import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SettingsModule } from './settings/settings.module';
import { AutoReplyModule } from './auto-reply.module';

@Module({
  imports: [UserModule, WhatsappModule, AnalyticsModule, SettingsModule, AutoReplyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
