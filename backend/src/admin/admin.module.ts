import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, CentralPrismaService],
})
export class AdminModule {}
