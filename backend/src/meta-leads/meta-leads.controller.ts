import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseInterceptors, UploadedFile, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MetaLeadsService } from './meta-leads.service';
import csv from 'csv-parser';

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
    @Query('campaignName') campaignName = '',
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.metaLeadsService.getLeads(
      tenantId,
      parseInt(page),
      parseInt(limit),
      search,
      status,
      campaignName,
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

  @Get(':formId/info')
  async getFormInfo(
    @Req() req: any,
    @Param('formId') formId: string,
    @Query('accessToken') accessToken: string,
  ) {
    try {
      const { data } = await this.metaLeadsService.getFormInfo(formId, accessToken);
      return data;
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to get form info',
        details: 'Please verify: 1) Form ID is correct, 2) Access token has leads_retrieval permission, 3) Form belongs to your Page'
      };
    }
  }

  @Post('sync')
  async syncLeads(
    @Req() req: any,
    @Body('pageId') pageId: string,
    @Body('formId') formId: string,
    @Body('accessToken') accessToken: string,
    @Body('phoneNumberId') phoneNumberId?: string,
    @Body('since') since?: string,
  ) {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const result = await this.metaLeadsService.syncLeadsFromFacebook(pageId, formId, accessToken, phoneNumberId, tenantId, since);
      return result;
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to sync leads',
        details: 'Common issues: 1) Invalid Form ID, 2) Missing permissions (leads_retrieval, pages_manage_metadata), 3) Form not linked to Page ID, 4) Expired access token'
      };
    }
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

  @Delete('all')
  async deleteAllLeads(@Req() req: any) {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const result = await this.metaLeadsService.deleteAllLeads(tenantId);
      return result;
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to delete leads'
      };
    }
  }

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCSV(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('pageId') pageId?: string,
    @Body('formId') formId?: string,
    @Body('phoneNumberId') phoneNumberId?: string,
  ) {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      
      if (!file) {
        return { error: true, message: 'No file uploaded' };
      }

      // Parse CSV
      const csvData: any[] = [];
      const Readable = require('stream').Readable;
      
      return new Promise((resolve, reject) => {
        const stream = Readable.from(file.buffer.toString());
        
        stream
          .pipe(csv())
          .on('data', (row: any) => {
            csvData.push(row);
          })
          .on('end', async () => {
            try {
              const result = await this.metaLeadsService.importLeadsFromCSV(
                csvData,
                pageId || 'csv-import',
                formId || 'csv-import',
                phoneNumberId,
                tenantId
              );
              resolve(result);
            } catch (error) {
              resolve({
                error: true,
                message: error.message || 'Failed to import CSV'
              });
            }
          })
          .on('error', (error: any) => {
            resolve({
              error: true,
              message: 'Failed to parse CSV file: ' + error.message
            });
          });
      });
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to process CSV file'
      };
    }
  }
}
