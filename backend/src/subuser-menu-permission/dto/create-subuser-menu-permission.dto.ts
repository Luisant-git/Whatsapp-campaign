import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

export class CreateSubuserMenuPermissionDto  {
  @ApiProperty({
    example: {
      analytics: true,
      chats: true,
      contacts: true,
      campaigns: false,
      settings: false,
      chatbot: false,
    },
  })
  @IsObject()
  @IsNotEmpty()
  permission: Record<string, boolean>;
}