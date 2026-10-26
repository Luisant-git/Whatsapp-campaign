import { Module } from '@nestjs/common';
import { MenuPermissionService } from './menu-permission.service';
import { MenuPermissionController } from './menu-permission.controller';

@Module({
  controllers: [MenuPermissionController],
  providers: [MenuPermissionService],
})
export class MenuPermissionModule {}
