import { Controller, Get, Post, Put, Delete, Body, Param, Req, Session } from '@nestjs/common';
import { MetaConfigService } from './meta-config.service';

@Controller('meta-config')
export class MetaConfigController {
  constructor(private readonly metaConfigService: MetaConfigService) {}

  private getTenantId(req: any, session: any): string {
    // Try x-tenant-id header first, then session
    return req.headers['x-tenant-id'] || session?.tenantId || session?.userId || 'default';
  }

  @Get()
  async getAll(@Req() req: any, @Session() session: any) {
    const tenantId = this.getTenantId(req, session);
    return this.metaConfigService.getAll(tenantId);
  }

  @Get(':id')
  async getOne(@Req() req: any, @Session() session: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req, session);
    return this.metaConfigService.getOne(tenantId, parseInt(id));
  }

  @Post()
  async create(@Req() req: any, @Session() session: any, @Body() data: any) {
    const tenantId = this.getTenantId(req, session);
    return this.metaConfigService.create(tenantId, data);
  }

  @Put(':id')
  async update(@Req() req: any, @Session() session: any, @Param('id') id: string, @Body() data: any) {
    const tenantId = this.getTenantId(req, session);
    return this.metaConfigService.update(tenantId, parseInt(id), data);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Session() session: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req, session);
    return this.metaConfigService.delete(tenantId, parseInt(id));
  }
}
