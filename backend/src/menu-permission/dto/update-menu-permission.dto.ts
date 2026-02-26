import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateMenuPermissionDto {
  @ApiProperty({
    example: {
      menus: {
        chatbot: false,
        campaigns: true,
      },
    },
    description: 'Updated menu permission JSON',
    type: Object,
  })
  @IsObject()
  permission: Record<string, any>;
}