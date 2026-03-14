import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Max, Min } from 'class-validator';

export class BulkEnableAutomationDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  whatsAppSettingsId: number;

  @ApiProperty({ example: 'DOB', enum: ['DOB', 'ANNIVERSARY'] })
  @IsIn(['DOB', 'ANNIVERSARY'])
  eventType: 'DOB' | 'ANNIVERSARY';

  @ApiProperty({ example: 7, description: '+7 = before 7 days, -7 = after 7 days' })
  @IsInt()
  @Min(-365)
  @Max(365)
  dayBefore: number;
}