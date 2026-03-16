import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsDto } from '../analytics/dto/analytics.dto';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminTenantAnalyticsDto } from './dto/admin-tenant-analytics.dto';
import { AdminSessionGuard } from '../auth/admin-session.guard';

@ApiTags('Admin Analytics')
@Controller('analytics/admin')
@UseGuards(AdminSessionGuard)
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get overall analytics for admin dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Overall analytics retrieved successfully',
    type: AnalyticsDto,
  })
  async getOverallAnalytics(): Promise<AnalyticsDto> {
    return this.adminAnalyticsService.getOverallAnalytics();
  }

  

  @Get('tenant-subscriptions')
  @ApiOperation({ summary: 'Get tenant subscription analytics' })
  @ApiResponse({
    status: 200,
    description: 'Tenant subscription analytics retrieved successfully',
    type: AdminTenantAnalyticsDto,
  })
  async getTenantSubscriptionAnalytics(): Promise<AdminTenantAnalyticsDto> {
    return this.adminAnalyticsService.getTenantSubscriptionAnalytics();
  }
}