import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class WhatsAppSettingsDto {
  @ApiProperty({ description: 'WhatsApp template name' })
  @IsString()
  templateName: string;

  @ApiProperty({ description: 'WhatsApp phone number ID' })
  @IsString()
  phoneNumberId: string;

  @ApiProperty({ description: 'WhatsApp access token' })
  @IsString()
  accessToken: string;

  @ApiProperty({ description: 'Webhook verify token', required: false })
  @IsOptional()
  @IsString()
  verifyToken?: string;

  @ApiProperty({ description: 'WhatsApp API URL' })
  @IsUrl()
  apiUrl: string;

  @ApiProperty({ description: 'Template language code', required: false })
  @IsOptional()
  @IsString()
  language?: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ description: 'WhatsApp template name', required: false })
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiProperty({ description: 'WhatsApp phone number ID', required: false })
  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @ApiProperty({ description: 'WhatsApp access token', required: false })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiProperty({ description: 'Webhook verify token', required: false })
  @IsOptional()
  @IsString()
  verifyToken?: string;

  @ApiProperty({ description: 'WhatsApp API URL', required: false })
  @IsOptional()
  @IsUrl()
  apiUrl?: string;

  @ApiProperty({ description: 'Template language code', required: false })
  @IsOptional()
  @IsString()
  language?: string;
}

export class SettingsResponseDto {
  @ApiProperty({ description: 'WhatsApp template name' })
  templateName: string;

  @ApiProperty({ description: 'WhatsApp phone number ID' })
  phoneNumberId: string;

  @ApiProperty({ description: 'WhatsApp access token (masked)' })
  accessToken: string;

  @ApiProperty({ description: 'Webhook verify token (masked)' })
  verifyToken: string;

  @ApiProperty({ description: 'WhatsApp API URL' })
  apiUrl: string;

  @ApiProperty({ description: 'Template language code' })
  language: string;
}