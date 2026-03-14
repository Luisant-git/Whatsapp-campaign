import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SessionGuard } from '../auth/session.guard';
import { TenantContext } from '../tenant/tenant.decorator';
import type { TenantContext as TenantContextType } from '../tenant/tenant.decorator';
import { RunDailyAutomationService } from './run-daily-automation.service';
import { CreateRunDailyAutomationDto } from './dto/create-run-daily-automation.dto';
import { ListRunDailyAutomationLogsQueryDto } from './dto/list-run-daily-automation-logs.query';
import { BulkEnableAutomationDto } from './dto/bulk-enable-automation.dto';
import { DisableAutomationTypeDto } from './dto/disable-automation-type.dto';

@ApiTags('RunDailyAutomation')
@ApiCookieAuth('connect.sid')
@Controller('run-daily-automation')
@UseGuards(SessionGuard)
export class RunDailyAutomationController {
  constructor(private readonly service: RunDailyAutomationService) { }

  @Get()
  list(@TenantContext() ctx: TenantContextType) {
    return this.service.list(ctx);
  }

  @Get('summary')
  summary(@TenantContext() ctx: TenantContextType) {
    return this.service.summary(ctx);
  }

  @Post()
  create(@Body() dto: CreateRunDailyAutomationDto, @TenantContext() ctx: TenantContextType) {
    return this.service.create(dto, ctx);
  }

  @Post('disable')
  disable(@Body() dto: DisableAutomationTypeDto, @TenantContext() ctx: TenantContextType) {
    return this.service.disableType(dto, ctx);
  }
  @Post('bulk')
  bulk(@Body() dto: BulkEnableAutomationDto, @TenantContext() ctx: TenantContextType) {
    return this.service.bulkEnable(dto, ctx);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantContext() ctx: TenantContextType) {
    return this.service.remove(Number(id), ctx);
  }

  @Get('logs')
  logs(@Query() q: ListRunDailyAutomationLogsQueryDto, @TenantContext() ctx: TenantContextType) {
    return this.service.listLogs(ctx, q);
  }
  
  @Get('logs/stats')
  logsStats(
    @Query() q: ListRunDailyAutomationLogsQueryDto,
    @TenantContext() ctx: TenantContextType,
  ) {
    return this.service.logsStats(ctx, q);
  }
}