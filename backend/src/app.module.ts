import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [UserModule, WhatsappModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
