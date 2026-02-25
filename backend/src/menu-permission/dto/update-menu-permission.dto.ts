import { PartialType } from '@nestjs/swagger';
import { CreateMenuPermissionDto } from './create-menu-permission.dto';

export class UpdateMenuPermissionDto extends PartialType(CreateMenuPermissionDto) {}
