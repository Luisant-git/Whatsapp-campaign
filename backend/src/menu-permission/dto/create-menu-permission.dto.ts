import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject } from 'class-validator';

export class CreateMenuPermissionDto {
  @ApiProperty({
    example: 1,
    description: 'Tenant ID'
  })
  @IsInt()
  tenantId: number;

  @ApiProperty({
    example: {
      menus: {
        chatbot: true,
        campaigns: false
      }
    },
    description: 'Full menu permission JSON'
  })
  @IsObject()
  permission: Record<string, any>;
}