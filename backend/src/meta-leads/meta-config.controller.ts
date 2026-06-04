import { Controller, Get, Post, Put, Delete, Body, Param, Req, Session } from '@nestjs/common';
import { MetaConfigService } from './meta-config.service';

@Controller('meta-config')
export class MetaConfigController {
  constructor(private readonly metaConfigService: MetaConfigService) {}

  private getTenantContext(req: any, session: any): { tenantId: string; dbUrl?: string } {
    // Try tenantContext from middleware first
    if (req.tenantContext) {
      return {
        tenantId: req.tenantContext.tenantId,
        dbUrl: req.tenantContext.dbUrl
      };
    }
    
    // Fallback to header or session
    const tenantId = req.headers['x-tenant-id'] || session?.tenantId || session?.userId || 'default';
    return { tenantId };
  }

  @Get()
  async getAll(@Req() req: any, @Session() session: any) {
    const { tenantId, dbUrl } = this.getTenantContext(req, session);
    return this.metaConfigService.getAll(tenantId, dbUrl);
  }

  @Get(':id')
  async getOne(@Req() req: any, @Session() session: any, @Param('id') id: string) {
    const { tenantId, dbUrl } = this.getTenantContext(req, session);
    return this.metaConfigService.getOne(tenantId, parseInt(id), dbUrl);
  }

  @Post('auto-connect')
  async autoConnect(@Req() req: any, @Session() session: any, @Body() data: any) {
    const { tenantId, dbUrl } = this.getTenantContext(req, session);
    return this.metaConfigService.autoConnect(tenantId, data, dbUrl);
  }

  @Post()
  async create(@Req() req: any, @Session() session: any, @Body() data: any) {
    const { tenantId, dbUrl } = this.getTenantContext(req, session);
    return this.metaConfigService.create(tenantId, data, dbUrl);
  }

  @Put(':id')
  async update(@Req() req: any, @Session() session: any, @Param('id') id: string, @Body() data: any) {
    const { tenantId, dbUrl } = this.getTenantContext(req, session);
    return this.metaConfigService.update(tenantId, parseInt(id), data, dbUrl);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Session() session: any, @Param('id') id: string) {
    const { tenantId, dbUrl } = this.getTenantContext(req, session);
    return this.metaConfigService.delete(tenantId, parseInt(id), dbUrl);
  }
}
