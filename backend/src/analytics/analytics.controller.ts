import { Controller, Get, UseGuards, Query, Session } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDto } from './dto/analytics.dto';
import { SessionGuard } from '../auth/session.guard';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get WhatsApp analytics and statistics' })
  @ApiQuery({ name: 'settingsName', required: false, description: 'Filter by settings name' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully', type: AnalyticsDto })
  async getAnalytics(@Session() session: any, @Query('settingsName') settingsName?: string): Promise<AnalyticsDto> {
    return this.analyticsService.getAnalytics(session.user.id, settingsName);
  }
}