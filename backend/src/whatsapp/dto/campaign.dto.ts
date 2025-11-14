import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ContactDto } from './send-bulk.dto';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name', example: 'Diwali Promotion 2024' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'WhatsApp template name', example: 'luisant_diwali_website50_v1' })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiProperty({ description: 'Array of contacts', type: [ContactDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts: ContactDto[];

  @ApiPropertyOptional({ description: 'Template parameters', type: [String] })
  @IsOptional()
  @IsArray()
  parameters?: any[];
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'WhatsApp template name' })
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiPropertyOptional({ description: 'Array of contacts', type: [ContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts?: ContactDto[];

  @ApiPropertyOptional({ description: 'Template parameters', type: [String] })
  @IsOptional()
  @IsArray()
  parameters?: any[];
}

export class CampaignResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  templateName: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failedCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CampaignMessageDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  error?: string;

  @ApiProperty()
  createdAt: Date;
}