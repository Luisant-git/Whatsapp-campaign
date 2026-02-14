import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTestDto {
  @ApiProperty({ example: 'Test Item', description: 'Name of the test item' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
