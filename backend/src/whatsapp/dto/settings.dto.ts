import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

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
}