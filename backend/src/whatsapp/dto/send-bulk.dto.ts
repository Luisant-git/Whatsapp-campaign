import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class ContactDto {
  @ApiProperty({ 
    description: 'Contact name',
    example: 'John Doe'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    description: 'Contact phone number with country code',
    example: '919876543210'
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class SendBulkDto {
  @ApiPropertyOptional({ 
    description: 'Array of phone numbers (alternative to contacts)',
    example: ['919876543210', '919876543211'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phoneNumbers?: string[];

  @ApiPropertyOptional({ 
    description: 'Array of contacts with names and phone numbers',
    type: [ContactDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  @ArrayMinSize(1)
  contacts?: ContactDto[];

  @ApiProperty({ 
    description: 'WhatsApp template name to use',
    example: 'luisant_diwali_website50_v1'
  })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiPropertyOptional({ 
    description: 'Template parameters (optional)',
    example: ['John', 'Special Offer'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  parameters?: any[];

  @ApiPropertyOptional({ 
    description: 'Header image URL for template',
    example: 'https://example.com/image.jpg'
  })
  @IsOptional()
  @IsString()
  headerImageUrl?: string;
}