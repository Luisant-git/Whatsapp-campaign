import { Controller, Get, Post, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { MetaConfigService } from './meta-config.service';

@Controller('meta-config')
export class MetaConfigController {
  constructor(private readonly metaConfigService: MetaConfigService) {}

  @Get()
  async getAll(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.metaConfigService.getAll(tenantId);
  }

  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.metaConfigService.getOne(tenantId, parseInt(id));
  }

  @Post()
  async create(@Req() req: any, @Body() data: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.metaConfigService.create(tenantId, data);
  }

  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.metaConfigService.update(tenantId, parseInt(id), data);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.metaConfigService.delete(tenantId, parseInt(id));
  }
}
