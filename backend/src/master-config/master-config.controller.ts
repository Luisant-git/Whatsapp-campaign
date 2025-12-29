import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Session } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionGuard } from '../auth/session.guard';
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
  async create(@Session() session: any, @Body() createDto: CreateMasterConfigDto) {
    return this.masterConfigService.create(createDto, session.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all master configs' })
  @ApiResponse({ status: 200, description: 'Master configs retrieved successfully' })
  async findAll(@Session() session: any) {
    return this.masterConfigService.findAll(session.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get master config by ID' })
  @ApiResponse({ status: 200, description: 'Master config retrieved successfully' })
  async findOne(@Session() session: any, @Param('id') id: string) {
    return this.masterConfigService.findOne(parseInt(id), session.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update master config' })
  @ApiResponse({ status: 200, description: 'Master config updated successfully' })
  async update(@Session() session: any, @Param('id') id: string, @Body() updateDto: UpdateMasterConfigDto) {
    return this.masterConfigService.update(parseInt(id), updateDto, session.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete master config' })
  @ApiResponse({ status: 200, description: 'Master config deleted successfully' })
  async remove(@Session() session: any, @Param('id') id: string) {
    return this.masterConfigService.remove(parseInt(id), session.user.id);
  }
}