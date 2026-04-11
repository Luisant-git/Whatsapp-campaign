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
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.metaLeadsService.updateLeadStatus(parseInt(id), status);
  }

  @Post('sync')
  async syncLeads(
    @Body('pageId') pageId: string,
    @Body('formId') formId: string,
    @Body('accessToken') accessToken: string,
    @Body('phoneNumberId') phoneNumberId?: string,
  ) {
    return this.metaLeadsService.syncLeadsFromFacebook(pageId, formId, accessToken, phoneNumberId);
  }

  @Get('webhook')
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const masterConfig = await this.metaLeadsService.getMasterConfig();
    if (mode === 'subscribe' && token === masterConfig?.verifyToken) {
      return challenge;
    }
    return 'Verification failed';
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    return this.metaLeadsService.handleWebhook(body);
  }
}
