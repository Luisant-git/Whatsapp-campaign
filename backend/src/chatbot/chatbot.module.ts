import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, TenantPrismaService, CentralPrismaService],
  exports: [ChatbotService],
})
export class ChatbotModule {}