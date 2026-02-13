import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { TenantPrismaService } from '../tenant-prisma.service';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, TenantPrismaService],
  exports: [ChatbotService],
})
export class ChatbotModule {}