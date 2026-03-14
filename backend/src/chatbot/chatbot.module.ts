import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { MenuPermissionService } from '../menu-permission/menu-permission.service';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, TenantPrismaService, CentralPrismaService, MenuPermissionService],
  exports: [ChatbotService],
})
export class ChatbotModule {}