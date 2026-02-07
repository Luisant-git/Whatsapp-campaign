// src/group/dto/create-group.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ description: 'Group name', example: 'Friends' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
