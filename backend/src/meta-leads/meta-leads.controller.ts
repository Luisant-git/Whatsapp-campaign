import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common';
import { MetaLeadsService } from './meta-leads.service';

@Controller('meta-leads')
export class MetaLeadsController {
  constructor(private readonly metaLeadsService: MetaLeadsService) {}

  @Get()
  async getLeads(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search = '',
    @Query('status') status = '',
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.metaLeadsService.getLeads(
      tenantId,
      parseInt(page),
      parseInt(limit),
      search,
      status,
    );
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.metaLeadsService.updateLeadStatus(parseInt(id), status, tenantId);
  }

  @Post('sync')
  async syncLeads(
    @Req() req: any,
    @Body('pageId') pageId: string,
    @Body('formId') formId: string,
    @Body('accessToken') accessToken: string,
    @Body('phoneNumberId') phoneNumberId?: string,
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.metaLeadsService.syncLeadsFromFacebook(pageId, formId, accessToken, phoneNumberId, tenantId);
  }

  @Get('webhook')
  async verifyWebhook(
    @Req() req: any,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const masterConfig = await this.metaLeadsService.getMasterConfig(tenantId);
    if (mode === 'subscribe' && token === masterConfig?.verifyToken) {
      return challenge;
    }
    return 'Verification failed';
  }

  @Post('webhook')
  async handleWebhook(@Req() req: any, @Body() body: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.metaLeadsService.handleWebhook(body, tenantId);
  }
}
