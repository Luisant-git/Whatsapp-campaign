import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateRunDailyAutomationDto {
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  whatsAppSettingsId?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  contactId?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  dayBefore?: number;

  @ApiPropertyOptional({ example: '2000-03-10T00:00:00.000Z' })
  @IsOptional()
  dob?: string | null;

  @ApiPropertyOptional({ example: '2024-03-10T00:00:00.000Z' })
  @IsOptional()
  anniversary?: string | null;
}