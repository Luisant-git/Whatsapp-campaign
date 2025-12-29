import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateMasterConfigDto {
  @ApiProperty({ description: 'Configuration name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'WhatsApp Phone Number ID' })
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @ApiProperty({ description: 'WhatsApp Access Token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({ description: 'WhatsApp Verify Token' })
  @IsString()
  @IsNotEmpty()
  verifyToken: string;

  @ApiProperty({ description: 'Is configuration active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMasterConfigDto {
  @ApiProperty({ description: 'Configuration name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'WhatsApp Phone Number ID', required: false })
  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @ApiProperty({ description: 'WhatsApp Access Token', required: false })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiProperty({ description: 'WhatsApp Verify Token', required: false })
  @IsOptional()
  @IsString()
  verifyToken?: string;

  @ApiProperty({ description: 'Is configuration active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}