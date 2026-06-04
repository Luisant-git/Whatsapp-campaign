import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';

@Injectable()
export class MetaConfigService {
  private readonly logger = new Logger(MetaConfigService.name);

  constructor(private prisma: TenantPrismaService) {}

  private async getClient(tenantId: string, dbUrl?: string) {
    const url = dbUrl || process.env.TENANT_DATABASE_URL || '';
    return await this.prisma.getTenantClientReady(tenantId, url) as any;
  }

  async getAll(tenantId: string, dbUrl?: string) {
    const client = await this.getClient(tenantId, dbUrl);
    return client.metaConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(tenantId: string, id: number, dbUrl?: string) {
    const client = await this.getClient(tenantId, dbUrl);
    return client.metaConfig.findUnique({
      where: { id },
    });
  }

  async getActive(tenantId: string, dbUrl?: string) {
    const client = await this.getClient(tenantId, dbUrl);
    return client.metaConfig.findFirst({
      where: { isActive: true },
    });
  }

  async autoConnect(tenantId: string, data: any, dbUrl?: string) {
    const { userAccessToken, pageId, name } = data;
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('META_APP_ID or META_APP_SECRET is not configured in backend');
    }

    // 1. Exchange for long-lived user token
    const exchangeUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userAccessToken}`;
    const exchangeRes = await fetch(exchangeUrl);
    if (!exchangeRes.ok) throw new Error('Failed to exchange user token for a permanent one');
    const exchangeData = await exchangeRes.json();
    const longLivedUserToken = exchangeData.access_token;

    // 2. Fetch pages using long-lived user token
    const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?access_token=${longLivedUserToken}`;
    const pagesRes = await fetch(pagesUrl);
    if (!pagesRes.ok) throw new Error('Failed to fetch pages with long-lived token');
    const pagesData = await pagesRes.json();

    // 3. Find the selected page to get its permanent page access token
    const page = pagesData.data?.find((p: any) => p.id === pageId);
    if (!page) {
      throw new Error('Selected Page not found or missing permissions. Did you select it during login?');
    }

    const pageAccessToken = page.access_token;
    
    // 4. Save to db
    return this.create(tenantId, {
      name: name || page.name,
      pageId: page.id,
      accessToken: pageAccessToken,
      verifyToken: process.env.META_VERIFY_TOKEN || 'default_verify_token',
      isActive: true
    }, dbUrl);
  }

  async create(tenantId: string, data: any, dbUrl?: string) {
    const client = await this.getClient(tenantId, dbUrl);
    
    // If this is set as active, deactivate others
    if (data.isActive) {
      await client.metaConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    return client.metaConfig.create({
      data: {
        name: data.name,
        pageId: data.pageId,
        accessToken: data.accessToken,
        verifyToken: data.verifyToken || null,
        isActive: data.isActive !== false,
      },
    });
  }

  async update(tenantId: string, id: number, data: any, dbUrl?: string) {
    const client = await this.getClient(tenantId, dbUrl);
    
    // If this is set as active, deactivate others
    if (data.isActive) {
      await client.metaConfig.updateMany({
        where: { 
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false },
      });
    }

    return client.metaConfig.update({
      where: { id },
      data: {
        name: data.name,
        pageId: data.pageId,
        accessToken: data.accessToken,
        verifyToken: data.verifyToken || null,
        isActive: data.isActive,
      },
    });
  }

  async delete(tenantId: string, id: number, dbUrl?: string) {
    const client = await this.getClient(tenantId, dbUrl);
    return client.metaConfig.delete({
      where: { id },
    });
  }
}
