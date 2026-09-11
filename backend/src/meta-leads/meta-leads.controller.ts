import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseInterceptors, UploadedFile, Delete, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MetaLeadsService } from './meta-leads.service';
import { MetaLeadsAutomationCronService } from './meta-leads-automation-cron.service';
import csv from 'csv-parser';
import * as crypto from 'crypto';

@Controller('meta-leads')
export class MetaLeadsController {
  constructor(
    private readonly metaLeadsService: MetaLeadsService,
    private readonly automationCronService: MetaLeadsAutomationCronService,
  ) { }

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

  @Get('forms')
  async getForms(@Req() req: any) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      const client = await (this.metaLeadsService as any).getClient(tenantId, dbUrl);
      const metaConfig = await client.metaConfig.findFirst({ where: { isActive: true } });
      if (!metaConfig) return { error: true, message: 'No active Meta config found' };

      const axios = require('axios');
      let forms: any[] = [];
      let url: string | null = `https://graph.facebook.com/v25.0/${metaConfig.pageId}/leadgen_forms?access_token=${metaConfig.accessToken}&limit=100&fields=id,name,leads_count,status`;
      while (url) {
        const { data } = await axios.get(url);
        forms.push(...(data.data || []));
        url = data.paging?.next || null;
      }
      return { forms };
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  @Get('webhook-info')
  async getWebhookInfo(@Req() req: any) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      const client = await (this.metaLeadsService as any).getClient(tenantId, dbUrl);

      // Get verifyToken from MasterConfig (primary) or MetaConfig (fallback)
      const masterConfig = await client.masterConfig.findFirst({ where: { isActive: true } });
      const metaConfig = await client.metaConfig.findFirst({ where: { isActive: true } });
      const verifyToken = masterConfig?.verifyToken || metaConfig?.verifyToken || process.env.META_VERIFY_TOKEN || 'not_configured';

      const host = req.headers['x-forwarded-host'] || req.headers.host || 'whatsapp.api.luisant.cloud';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const webhookUrl = `${protocol}://${host}/meta-leads/webhook`;
      return {
        webhookUrl,
        verifyToken,
        isConfigured: verifyToken !== 'not_configured',
        steps: [
          'Go to Meta for Developers → Your App → Webhooks',
          'Click "Add Subscriptions" under the Page object',
          `Set Callback URL to: ${webhookUrl}`,
          `Set Verify Token to: ${verifyToken}`,
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
    const signature = req.headers['x-hub-signature-256'];

    // Resolve dynamic App Secret from DB (if available for this tenant)
    let appSecret = await this.metaLeadsService.resolveAppSecretForWebhook(body);

    // Fallback to global ENV secret
    if (!appSecret) {
      appSecret = process.env.META_APP_SECRET || null;
      console.log('Using fallback global META_APP_SECRET from .env');
    } else {
      console.log('Using dynamic App Secret resolved from tenant MasterConfig');
    }

    if (!appSecret) {
      console.error('Webhook failed: No App Secret could be resolved (Dynamic or Global)');
      throw new UnauthorizedException('No App Secret available to verify webhook');
    }

    if (!signature) {
      console.error('Webhook failed: Missing x-hub-signature-256 header');
      throw new UnauthorizedException('Missing x-hub-signature-256 header');
    }

    console.log(`Webhook arrived. req.rawBody exists? ${!!req.rawBody}`);

    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody || JSON.stringify(body)).digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    const sigBuffer = Buffer.from(signature as string, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      console.error(`Webhook signature mismatch! Received: ${signature}, Expected: ${expectedSignature}`);
      if (!req.rawBody) console.error('Warning: req.rawBody was missing, fallback JSON.stringify caused signature failure.');
      throw new UnauthorizedException('Invalid x-hub-signature-256');
    }

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

  @Delete(':id')
  async deleteLead(@Req() req: any, @Param('id') id: string) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      const result = await this.metaLeadsService.deleteLead(Number(id), tenantId, dbUrl);
      return result;
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to delete lead'
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

  @Get('automation-progress')
  async getAutomationProgress(
    @Req() req: any,
    @Query('targetType') targetType: string,
    @Query('campaignName') campaignName: string,
    @Query('groupId') groupId: string,
    @Query('totalSteps') totalSteps: string,
  ) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      return await this.metaLeadsService.getAutomationProgress(
        tenantId,
        targetType,
        campaignName,
        groupId,
        parseInt(totalSteps) || 1,
        dbUrl
      );
    } catch (error) {
      return { error: true, message: error.message || 'Failed to fetch progress' };
    }
  }

  @Patch('automation-toggle')
  async toggleAutomationSequence(
    @Req() req: any,
    @Body('targetType') targetType: string,
    @Body('campaignName') campaignName: string,
    @Body('groupId') groupId: string,
    @Body('isActive') isActive: boolean,
  ) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      return await this.metaLeadsService.toggleAutomationSequence(
        tenantId,
        targetType,
        campaignName,
        groupId,
        isActive,
        dbUrl
      );
    } catch (error) {
      return { error: true, message: error.message || 'Failed to toggle sequence' };
    }
  }

  @Get('automation-logs')
  async getAutomationLogs(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status: string = 'all'
  ) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      return await this.metaLeadsService.getAutomationLogs(
        tenantId,
        parseInt(page) || 1,
        parseInt(limit) || 10,
        status,
        dbUrl
      );
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to fetch automation logs'
      };
    }
  }

  @Get('automation-logs/total')
  async getAutomationLogsTotal(
    @Req() req: any,
    @Query('status') status: string = 'all'
  ) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      return await this.metaLeadsService.getAutomationLogsTotal(tenantId, status, dbUrl);
    } catch (error) {
      return {
        error: true,
        message: error.message || 'Failed to fetch automation logs total'
      };
    }
  }

  // ── Manual trigger / debug endpoint ──────────────────────────────────────
  // Call GET /meta-leads/automation-run-now?tenantId=YOUR_TENANT_ID
  // This bypasses session auth — tenantId from the query param is used directly.
  // Remove or restrict this endpoint after debugging.
  @Get('automation-run-now')
  async runAutomationNow(@Req() req: any, @Query('tenantId') tenantIdParam?: string) {
    try {
      let tenantId: string;
      let dbUrl: string;

      if (tenantIdParam) {
        // Direct debug path: look up tenant by ID without needing a session
        const { CentralPrismaService } = require('../central-prisma.service');
        const cp = new CentralPrismaService();
        const tenant = await cp.executeWithRetry((p: any) =>
          p.tenant.findFirst({ where: { id: Number(tenantIdParam), isActive: true } })
        );
        if (!tenant) return { ok: false, error: `Tenant ${tenantIdParam} not found or inactive` };
        tenantId = String(tenant.id);
        dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      } else {
        // Normal path: use session/header
        const ctx = await this.getTenantContext(req);
        tenantId = ctx.tenantId;
        dbUrl = ctx.dbUrl;
      }

      const result = await this.automationCronService.runForTenant(tenantId, dbUrl);
      return { ok: true, tenantId, ...result };
    } catch (error) {
      return { ok: false, error: error.message || String(error) };
    }
  }

  // ── Reset automation progress for a group ────────────────────────────────
  // GET /meta-leads/automation-reset-group?groupId=5
  @Get('automation-reset-group')
  async resetGroupAutomation(@Req() req: any, @Query('groupId') groupId: string) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      if (!groupId) return { ok: false, error: 'groupId query param is required' };

      const client = await (this.automationCronService as any).tenantPrisma
        .getTenantClientReady(tenantId, dbUrl);

      const gid = parseInt(groupId);
      if (isNaN(gid)) return { ok: false, error: 'groupId must be a number' };

      // Count contacts before reset
      const before = await client.contact.count({ where: { groupId: gid } });

      // Reset step counter and clear sent timestamp
      const updated = await client.contact.updateMany({
        where: { groupId: gid },
        data: { lastAutomationStep: 0, isAutomationSent: false, automationSentAt: null },
      });

      // Read back to confirm
      const contacts = await client.contact.findMany({
        where: { groupId: gid },
        select: { id: true, name: true, phone: true, lastAutomationStep: true, automationSentAt: true, createdAt: true },
      });

      return {
        ok: true,
        groupId: gid,
        contactsInGroup: before,
        contactsReset: updated.count,
        contactsAfterReset: contacts,
        message: `Reset ${updated.count} contact(s). Run automation-run-now to fire immediately.`,
      };
    } catch (error) {
      return { ok: false, error: error.message || String(error) };
    }
  }

  // ── Clean up duplicate chats caused by + prefix phone mismatch ──────────
  // GET /meta-leads/automation-cleanup-chats
  // Normalizes all WhatsAppMessage.from values to digits-only format,
  // eliminating duplicate chat entries caused by mixed phone formats.
  @Get('automation-cleanup-chats')
  async cleanupDuplicateChats(@Req() req: any) {
    try {
      const { tenantId, dbUrl } = await this.getTenantContext(req);
      const client = await (this.automationCronService as any).tenantPrisma
        .getTenantClientReady(tenantId, dbUrl);

      // 1. Delete messages where "from" starts with "+" (duplicates from old automation)
      const withPlus = await client.whatsAppMessage.findMany({
        where: { from: { startsWith: '+' } },
        select: { id: true, from: true, messageId: true },
      });

      let deleted = 0;
      if (withPlus.length > 0) {
        await client.whatsAppMessage.deleteMany({
          where: { id: { in: withPlus.map((m: any) => m.id) } },
        });
        deleted = withPlus.length;
      }

      // 2. Find any other non-standard formats (double country code like 91919...)
      const allMessages = await client.whatsAppMessage.findMany({
        select: { id: true, from: true },
      });

      const toFix: { id: number; normalized: string }[] = [];
      for (const msg of allMessages) {
        const digits = String(msg.from || '').replace(/\D/g, '');
        // Fix double country code: 91919XXXXXXX → 919XXXXXXX
        let normalized = digits;
        if (digits.length === 14 && digits.startsWith('9191')) {
          normalized = digits.slice(2); // strip extra 91
        }
        if (normalized !== msg.from) {
          toFix.push({ id: msg.id, normalized });
        }
      }

      let normalized = 0;
      for (const fix of toFix) {
        try {
          await client.whatsAppMessage.update({
            where: { id: fix.id },
            data: { from: fix.normalized, to: fix.normalized },
          });
          normalized++;
        } catch { /* skip if unique constraint hit */ }
      }

      return {
        ok: true,
        deletedPlusPrefix: deleted,
        normalizedDoubleCountryCode: normalized,
        message: `Cleaned up ${deleted} + prefix message(s) and normalized ${normalized} double-country-code message(s). Refresh the chat page.`,
      };
    } catch (error) {
      return { ok: false, error: error.message || String(error) };
    }
  }
}
