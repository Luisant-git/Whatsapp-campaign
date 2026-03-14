import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Max, Min } from 'class-validator';

export class DisableAutomationTypeDto {
  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  whatsAppSettingsId: number;

  @ApiProperty({ example: 'DOB', enum: ['DOB', 'ANNIVERSARY'] })
  @IsIn(['DOB', 'ANNIVERSARY'])
  eventType: 'DOB' | 'ANNIVERSARY';

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(-365)
  @Max(365)
  dayBefore: number;
}