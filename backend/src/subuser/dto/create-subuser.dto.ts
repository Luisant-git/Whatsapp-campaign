import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateSubuserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: '9876543210', description: '10 to 15 digit mobile number' })
  @IsString()
  @Matches(/^[0-9]{10,15}$/, { message: 'mobileNumber must be 10 to 15 digits' })
  mobileNumber: string;

  @ApiProperty({ example: 'Manager', required: false })
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}