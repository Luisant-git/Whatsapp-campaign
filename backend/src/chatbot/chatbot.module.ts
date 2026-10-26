import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { MenuPermissionService } from '../menu-permission/menu-permission.service';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, MenuPermissionService],
  exports: [ChatbotService],
})
export class ChatbotModule {}