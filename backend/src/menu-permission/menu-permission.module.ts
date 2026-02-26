import { Module } from '@nestjs/common';
import { MenuPermissionService } from './menu-permission.service';
import { MenuPermissionController } from './menu-permission.controller';
import { CentralPrismaService } from 'src/central-prisma.service';

@Module({
  controllers: [MenuPermissionController],
  providers: [MenuPermissionService,CentralPrismaService],
})
export class MenuPermissionModule {}
