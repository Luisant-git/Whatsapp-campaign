import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDto } from './dto/analytics.dto';
import { SessionGuard } from '../auth/session.guard';
import { TenantContext } from '../tenant/tenant.decorator';
import type { TenantContext as TenantContextType } from '../tenant/tenant.decorator';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get WhatsApp analytics and statistics' })
  @ApiQuery({ name: 'settingsName', required: false, description: 'Filter by settings name' })
  @ApiQuery({ name: 'templateName', required: false, description: 'Filter by template name' })
  @ApiQuery({ name: 'datePreset', required: false, description: 'Preset: today, yesterday, last_7_days, last_30_days, this_month, all' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Custom start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Custom end date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully', type: AnalyticsDto })
  async getAnalytics(
    @TenantContext() tenantContext: TenantContextType,
    @Query('settingsName') settingsName?: string,
    @Query('templateName') templateName?: string,
    @Query('datePreset') datePreset?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AnalyticsDto> {
    return this.analyticsService.getAnalytics(
      tenantContext,
      settingsName,
      templateName,
      datePreset,
      startDate,
      endDate,
    );
  }
}