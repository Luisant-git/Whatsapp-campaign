import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseInterceptors, UploadedFile, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MetaLeadsService } from './meta-leads.service';
import csv from 'csv-parser';

@Controller('meta-leads')
export class MetaLeadsController {
  constructor(private readonly metaLeadsService: MetaLeadsService) {}

  private async getTenantContext(req: any): Promise<{ tenantId: string; dbUrl: string }> {
    // Try tenantContext from middleware first
    if (req.tenantContext?.tenantId && req.tenantContext?.dbUrl) {
      return {
        tenantId: req.tenantContext.tenantId,
        dbUrl: req.tenantContext.dbUrl
      };
    }
    
    // Fallback: manually resolve tenant from header
    const tenantHeader = req.headers['x-tenant-id'];
    if (!tenantHeader) {
      throw new Error('x-tenant-id header is required');
    }

    // Import CentralPrismaService to look up tenant
    const { CentralPrismaService } = require('../central-prisma.service');
    const centralPrisma = new CentralPrismaService();
    
    const tenant = await centralPrisma.executeWithRetry((prisma) =>
      prisma.tenant.findFirst({
        where: { 
          OR: [
            { email: { contains: tenantHeader, mode: 'insensitive' } }, 
            { dbName: tenantHeader },
            { id: isNaN(Number(tenantHeader)) ? undefined : Number(tenantHeader) }
          ], 
          isActive: true 
        },
      })
    );

    if (!tenant) {
      throw new Error(`Tenant not found for: ${tenantHeader}`);
    }

    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    return { tenantId: String(tenant.id), dbUrl };
  }

  @Get()
  async getLeads(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search = '',
    @Query('status') status = '',
    @Query('campaignName') campaignName = '',
  ) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      return this.metaLeadsService.getLeads(
        tenantId,
        parseInt(page),
        parseInt(limit),
        search,
        status,
        campaignName,
        dbUrl,
      );
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to fetch leads',
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      };
    }
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      return this.metaLeadsService.updateLeadStatus(parseInt(id), status, tenantId, dbUrl);
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to update status'
      };
    }
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
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      const result = await this.metaLeadsService.syncLeadsFromFacebook(pageId, formId, accessToken, phoneNumberId, tenantId, dbUrl, since);
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
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      const masterConfig = await this.metaLeadsService.getMasterConfig(tenantId, dbUrl);
      if (mode === 'subscribe' && token === masterConfig?.verifyToken) {
        return challenge;
      }
      return 'Verification failed';
    } catch (error) {
      return 'Verification failed: ' + error.message;
    }
  }

  @Post('webhook')
  async handleWebhook(@Req() req: any, @Body() body: any) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      return this.metaLeadsService.handleWebhook(body, tenantId, dbUrl);
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  @Delete('all')
  async deleteAllLeads(@Req() req: any) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      const result = await this.metaLeadsService.deleteAllLeads(tenantId, dbUrl);
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
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      
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
                tenantId,
                dbUrl
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
