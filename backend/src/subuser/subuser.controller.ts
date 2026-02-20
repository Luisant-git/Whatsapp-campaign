import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SessionGuard } from '../auth/session.guard';

import { TenantContext } from '../tenant/tenant.decorator';
import type { TenantContext as TenantContextType } from '../tenant/tenant.decorator';

import { SubuserService } from './subuser.service';
import { CreateSubuserDto } from './dto/create-subuser.dto';
import { UpdateSubuserDto } from './dto/update-subuser.dto';

@ApiTags('SubUser')
@Controller('subuser')
@UseGuards(SessionGuard)
export class SubuserController {
  constructor(private readonly subuserService: SubuserService) {}

  @Post()
  @ApiOperation({ summary: 'Create sub user (checks subscription & limit)' })
  create(
    @Body() dto: CreateSubuserDto,
    @TenantContext() tenantContext: TenantContextType,
  ) {
    return this.subuserService.create(dto, tenantContext);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sub users' })
  findAll(@TenantContext() tenantContext: TenantContextType) {
    return this.subuserService.findAll(tenantContext);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sub user' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSubuserDto,
    @TenantContext() tenantContext: TenantContextType,
  ) {
    return this.subuserService.update(Number(id), dto, tenantContext);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete sub user' })
  remove(
    @Param('id') id: string,
    @TenantContext() tenantContext: TenantContextType,
  ) {
    return this.subuserService.remove(Number(id), tenantContext);
  }

  @Get('usage/limit')
  @ApiOperation({ summary: 'Get usage and plan limit info' })
  getUsage(@TenantContext() tenantContext: TenantContextType) {
    return this.subuserService.getUsageInfo(tenantContext);
  }
}
