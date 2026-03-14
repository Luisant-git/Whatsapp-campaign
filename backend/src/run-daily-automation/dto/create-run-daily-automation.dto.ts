import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateRunDailyAutomationDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  whatsAppSettingsId: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  contactId: number;

  // allow -7 (after) and +7 (before)
  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(-365)
  @Max(365)
  dayBefore: number;

  @ApiProperty({ example: 'DOB', enum: ['DOB', 'ANNIVERSARY'] })
  @IsIn(['DOB', 'ANNIVERSARY'])
  eventType: 'DOB' | 'ANNIVERSARY';

  @ApiPropertyOptional()
  @IsOptional()
  dob?: string;

  @ApiPropertyOptional()
  @IsOptional()
  anniversary?: string;
}