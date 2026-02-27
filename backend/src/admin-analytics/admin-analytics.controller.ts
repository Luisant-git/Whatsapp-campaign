import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsDto } from '../analytics/dto/analytics.dto';
import { AdminAnalyticsService } from './admin-analytics.service';
import { SessionGuard } from '../auth/session.guard';
import { AdminTenantAnalyticsDto } from './dto/admin-tenant-analytics.dto';

@ApiTags('Admin Analytics')
@Controller('analytics/admin')
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get()
  @UseGuards(SessionGuard) // Replace with AdminGuard if available
  @ApiOperation({ summary: 'Get overall analytics for admin dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Overall analytics retrieved successfully',
    type: AnalyticsDto,
  })
  async getOverallAnalytics(): Promise<AnalyticsDto> {
    return this.adminAnalyticsService.getOverallAnalytics();
  }


   // -----------------------------------------
   @Get('tenant-subscriptions')
   @ApiOperation({ summary: 'Get tenant subscription analytics' })
   @ApiResponse({
     status: 200,
     description: 'Tenant subscription analytics retrieved successfully',
     type: AdminTenantAnalyticsDto,
   })
   @ApiResponse({
     status: 401,
     description: 'Unauthorized',
   })
   async getTenantSubscriptionAnalytics(): Promise<AdminTenantAnalyticsDto> {
     return this.adminAnalyticsService.getTenantSubscriptionAnalytics();
   
 }
}