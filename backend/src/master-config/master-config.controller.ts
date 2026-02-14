import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionGuard } from '../auth/session.guard';
import { TenantContext } from '../tenant/tenant.decorator';
import type { TenantContext as TenantContextType } from '../tenant/tenant.decorator';
import { MasterConfigService } from './master-config.service';
import { CreateMasterConfigDto, UpdateMasterConfigDto } from './dto/master-config.dto';

@ApiTags('master-config')
@Controller('master-config')
@UseGuards(SessionGuard)
export class MasterConfigController {
  constructor(private readonly masterConfigService: MasterConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Create master config' })
  @ApiResponse({ status: 201, description: 'Master config created successfully' })
  async create(@TenantContext() tenantContext: TenantContextType, @Body() createDto: CreateMasterConfigDto) {
    return this.masterConfigService.create(createDto, tenantContext);
  }

  @Get()
  @ApiOperation({ summary: 'Get all master configs' })
  @ApiResponse({ status: 200, description: 'Master configs retrieved successfully' })
  async findAll(@TenantContext() tenantContext: TenantContextType) {
    return this.masterConfigService.findAll(tenantContext);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get master config by ID' })
  @ApiResponse({ status: 200, description: 'Master config retrieved successfully' })
  async findOne(@TenantContext() tenantContext: TenantContextType, @Param('id') id: string) {
    return this.masterConfigService.findOne(parseInt(id), tenantContext);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update master config' })
  @ApiResponse({ status: 200, description: 'Master config updated successfully' })
  async update(@TenantContext() tenantContext: TenantContextType, @Param('id') id: string, @Body() updateDto: UpdateMasterConfigDto) {
    return this.masterConfigService.update(parseInt(id), updateDto, tenantContext);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete master config' })
  @ApiResponse({ status: 200, description: 'Master config deleted successfully' })
  async remove(@TenantContext() tenantContext: TenantContextType, @Param('id') id: string) {
    return this.masterConfigService.remove(parseInt(id), tenantContext);
  }
}