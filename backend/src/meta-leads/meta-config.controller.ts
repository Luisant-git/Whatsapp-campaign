import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, Session } from '@nestjs/common';
import { MetaConfigService } from './meta-config.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('meta-config')
@UseGuards(SessionGuard)
export class MetaConfigController {
  constructor(private readonly metaConfigService: MetaConfigService) {}

  @Get()
  async getAll(@Session() session: any) {
    const tenantId = session.tenantId || session.userId;
    return this.metaConfigService.getAll(tenantId);
  }

  @Get(':id')
  async getOne(@Session() session: any, @Param('id') id: string) {
    const tenantId = session.tenantId || session.userId;
    return this.metaConfigService.getOne(tenantId, parseInt(id));
  }

  @Post()
  async create(@Session() session: any, @Body() data: any) {
    const tenantId = session.tenantId || session.userId;
    return this.metaConfigService.create(tenantId, data);
  }

  @Put(':id')
  async update(@Session() session: any, @Param('id') id: string, @Body() data: any) {
    const tenantId = session.tenantId || session.userId;
    return this.metaConfigService.update(tenantId, parseInt(id), data);
  }

  @Delete(':id')
  async delete(@Session() session: any, @Param('id') id: string) {
    const tenantId = session.tenantId || session.userId;
    return this.metaConfigService.delete(tenantId, parseInt(id));
  }
}
