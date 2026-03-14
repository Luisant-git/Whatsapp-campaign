
import { IsIn, IsNumberString, IsOptional } from 'class-validator';

export class ListRunDailyAutomationLogsQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsIn(['sent', 'failed'])
  status?: 'sent' | 'failed';

  @IsOptional()
  @IsIn(['DOB', 'ANNIVERSARY'])
  type?: 'DOB' | 'ANNIVERSARY';
}