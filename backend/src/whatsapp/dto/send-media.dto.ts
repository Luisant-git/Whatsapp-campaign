import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendMediaDto {
  @ApiProperty({ 
    description: 'Recipient phone number with country code',
    example: '919876543210'
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiPropertyOptional({ 
    description: 'Media caption (optional)',
    example: 'Check out this image!'
  })
  @IsOptional()
  @IsString()
  caption?: string;
}