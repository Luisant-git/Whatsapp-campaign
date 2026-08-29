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

  @Get('webhook-info')
  async getWebhookInfo(@Req() req: any) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      const client = await (this.metaLeadsService as any).getClient(tenantId, dbUrl);
      const metaConfig = await client.metaConfig.findFirst({ where: { isActive: true } });
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'whatsapp.api.luisant.cloud';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      return {
        webhookUrl: `${protocol}://${host}/meta-leads/webhook`,
        verifyToken: metaConfig?.verifyToken || process.env.META_VERIFY_TOKEN || 'not_configured',
        isConfigured: !!metaConfig?.verifyToken,
        steps: [
          'Go to Meta for Developers → Your App → Webhooks',
          'Click "Add Subscriptions" under the Page object',
          `Set Callback URL to: ${protocol}://${host}/meta-leads/webhook`,
          `Set Verify Token to: ${metaConfig?.verifyToken || process.env.META_VERIFY_TOKEN || 'not_configured'}`,
          'Subscribe to the "leadgen" field',
          'Click Verify and Save'
        ]
      };
    } catch (error) {
      return { error: true, message: error.message };
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
      const isValid = await this.metaLeadsService.verifyWebhookToken(token);
      if (mode === 'subscribe' && isValid) {
        return challenge;
      }
      return 'Verification failed';
    } catch (error) {
      return 'Verification failed: ' + error.message;
    }
  }

  @Post('webhook')
  async handleWebhook(@Req() req: any, @Body() body: any) {
    // Process async so we can return immediately
    setImmediate(() => {
      this.metaLeadsService.handleWebhook(body).catch(error => {
        console.error('Async Meta Webhook processing error:', error);
      });
    });
    return 'EVENT_RECEIVED';
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

  @Get('automation-rules')
  async getAutomationRules(@Req() req: any) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      return this.metaLeadsService.getAutomationRules(tenantId, dbUrl);
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to fetch automation rules'
      };
    }
  }

  @Post('automation-rules')
  async saveAutomationRule(@Req() req: any, @Body() body: any) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      return this.metaLeadsService.saveAutomationRule(body, tenantId, dbUrl);
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to save automation rule'
      };
    }
  }

  @Delete('automation-rules/:id')
  async deleteAutomationRule(@Req() req: any, @Param('id') id: string) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      return this.metaLeadsService.deleteAutomationRule(parseInt(id), tenantId, dbUrl);
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to delete automation rule'
      };
    }
  }
}
