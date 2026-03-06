import { Module } from '@nestjs/common';
import { SubUserMenuPermissionController } from './subuser-menu-permission.controller';
import { SubUserMenuPermissionService } from './subuser-menu-permission.service';


@Module({
  controllers: [SubUserMenuPermissionController],
  providers: [SubUserMenuPermissionService],
})
export class SubuserMenuPermissionModule {}
