import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, PrismaService],
  exports: [ChatbotService],
})
export class ChatbotModule {}