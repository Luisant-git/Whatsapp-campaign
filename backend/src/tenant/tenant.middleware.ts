import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  // In-memory cache: tenantId/domain -> { tenant, dbUrl, expiresAt }
  private readonly cache = new Map<string, { dbUrl: string; tenantId: string; expiresAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private centralPrisma: CentralPrismaService) { }

  private getCached(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  private setCache(key: string, tenantId: string, dbUrl: string) {
    this.cache.set(key, { tenantId, dbUrl, expiresAt: Date.now() + this.CACHE_TTL });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl || req.url;

    if (
      path === '/customer-details-flow/health' ||
      path === '/customer-details-flow/exchange' ||
      path.startsWith('/customer-details-flow/') ||
      path === '/health' ||
      path === '/exchange' ||
      path === '/meta/flows' ||
      path === '/meta/flows/health' ||
      path.startsWith('/meta/flows/') ||
      path.startsWith('/admin') ||
      path.startsWith('/analytics/admin') ||
      path.startsWith('/tenentnote') ||
      path.startsWith('/docs') ||
      path.startsWith('/webhooks') ||
      path.startsWith('/ecommerce/payment-callback') ||
      path.includes('/flow-appointments/') && path.endsWith('/finish') ||
      path.includes('/api/flow-appointments/') && path.endsWith('/finish')
    ) {
      return next();
    }

    const session: any = (req as any).session;
    const origin = req.get('origin') || req.get('referer');
    let tenantId: string | null = null;
    let dbUrl: string | null = null;

    // 1. Try x-tenant-id header
    const tenantHeader = req.headers['x-tenant-id'] as string;
    if (tenantHeader) {
      const cached = this.getCached(`header:${tenantHeader}`);
      if (cached) {
        tenantId = cached.tenantId;
        dbUrl = cached.dbUrl;
      } else {
        const tenant = await this.centralPrisma.executeWithRetry((prisma) =>
          prisma.tenant.findFirst({
            where: { OR: [{ email: { contains: tenantHeader, mode: 'insensitive' } }, { dbName: tenantHeader }], isActive: true },
          })
        );
        if (tenant) {
          dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          tenantId = String(tenant.id);
          this.setCache(`header:${tenantHeader}`, tenantId, dbUrl);
        }
      }
    }

    // 2. Try origin domain
    if (!tenantId && origin) {
      try {
        const hostname = new URL(origin).hostname;
        if (hostname !== 'whatsapp.luisant.cloud' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
          const cached = this.getCached(`domain:${hostname}`);
          if (cached) {
            tenantId = cached.tenantId;
            dbUrl = cached.dbUrl;
          } else {
            const tenant = await this.centralPrisma.executeWithRetry((prisma) =>
              prisma.tenant.findFirst({
                where: { domain: { contains: hostname, mode: 'insensitive' }, isActive: true },
              })
            );
            if (tenant) {
              dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
              tenantId = String(tenant.id);
              this.setCache(`domain:${hostname}`, tenantId, dbUrl);
            }
          }
        }
      } catch { /* invalid origin URL, skip */ }
    }

    // 3. Try session
    if (!tenantId) {
      const rawId = session?.tenantId ?? session?.userId;
      const numId = Number(rawId);
      if (!numId || !Number.isFinite(numId)) {
        throw new UnauthorizedException('No tenant context');
      }
      const cacheKey = `session:${numId}`;
      const cached = this.getCached(cacheKey);
      if (cached) {
        tenantId = cached.tenantId;
        dbUrl = cached.dbUrl;
      } else {
        const tenant = await this.centralPrisma.executeWithRetry((prisma) =>
          prisma.tenant.findUnique({ where: { id: numId } })
        );
        if (!tenant || !tenant.isActive) {
          throw new UnauthorizedException('Invalid or inactive tenant');
        }
        dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        tenantId = String(tenant.id);
        this.setCache(cacheKey, tenantId, dbUrl);
      }
    }

    if (!tenantId || !dbUrl) {
      throw new UnauthorizedException('Invalid or inactive tenant');
    }

    (req as any).tenantContext = { tenantId, dbUrl };
    next();
  }
}