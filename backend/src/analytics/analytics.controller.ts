import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully', type: AnalyticsDto })
  async getAnalytics(): Promise<AnalyticsDto> {
    return this.analyticsService.getAnalytics();
  }
}