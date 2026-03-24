import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private centralPrisma: CentralPrismaService) { }

  async use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl || req.url;
    
    console.log('🔍 TenantMiddleware - Processing path:', path);
    console.log('🔍 TenantMiddleware - Method:', req.method);

    // ✅ EXPLICIT FLOW ROUTE BYPASS
    if (
      path === '/customer-details-flow/health' ||
      path === '/customer-details-flow/exchange' ||
      path.startsWith('/customer-details-flow/') ||
      path === '/health' ||  // ← Added for nginx stripped paths
      path === '/exchange' || // ← Added for nginx stripped paths
      path === '/meta/flows' ||
      path === '/meta/flows/health' ||
      path.startsWith('/meta/flows/') ||
      path.startsWith('/admin') ||
      path.startsWith('/analytics/admin') ||
      path.startsWith('/tenentnote') ||
      path.startsWith('/docs') ||
      path.startsWith('/webhooks') ||
      path.startsWith('/ecommerce/payment-callback') // ← Payment callback bypass
    ) {
      console.log('✅ TenantMiddleware - BYPASSING tenant check for path:', path);
      return next();
    }
    
    console.log('🔒 TenantMiddleware - Applying tenant check for path:', path);

    const session: any = (req as any).session;
    const origin = req.get('origin') || req.get('referer');

    console.log('TenantMiddleware - Session ID:', session?.id);
    console.log('TenantMiddleware - Cookies:', req.headers.cookie);
    console.log('TenantMiddleware - Session tenantId:', session?.tenantId);
    console.log('TenantMiddleware - Session userId:', session?.userId);
    console.log('TenantMiddleware - Origin:', origin);

    let tenant: any = null;

    // 🔥 NEW: Check for x-tenant-id header first (for API testing)
    const tenantHeader = req.headers['x-tenant-id'] as string;
    if (tenantHeader) {
      console.log('TenantMiddleware - Found x-tenant-id header:', tenantHeader);
      tenant = await this.centralPrisma.tenant.findFirst({
        where: {
          OR: [
            { email: { contains: tenantHeader, mode: 'insensitive' } },
            { dbName: tenantHeader }
          ],
          isActive: true
        },
      });
      console.log('TenantMiddleware - Found tenant by header:', tenant?.id, tenant?.email);
    }

    // If no tenant found by header, try to identify tenant by the origin domain (where the request came from)
    if (origin) {
      const originUrl = new URL(origin);
      const hostname = originUrl.hostname;

      console.log('TenantMiddleware - Origin hostname:', hostname);

      if (hostname !== 'whatsapp.luisant.cloud' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        tenant = await this.centralPrisma.tenant.findFirst({
          where: {
            domain: {
              contains: hostname,
              mode: 'insensitive'
            },
            isActive: true
          },
        });
        console.log('TenantMiddleware - Found tenant by domain:', tenant?.id, tenant?.email);
      }
    }

    // If no tenant found by origin, try session-based identification
    if (!tenant) {
      const tenantIdRaw = session?.tenantId ?? session?.userId;
      const tenantId = Number(tenantIdRaw);

      console.log('TenantMiddleware - Trying session-based tenant ID:', tenantId);

      if (!tenantId || !Number.isFinite(tenantId)) {
        console.log('TenantMiddleware - No valid tenant ID found');
        throw new UnauthorizedException('No tenant context');
      }

      tenant = await this.centralPrisma.tenant.findUnique({
        where: { id: tenantId },
      });
      console.log('TenantMiddleware - Found tenant by session:', tenant?.id, tenant?.email);
    }

    if (!tenant || !tenant.isActive) {
      console.log('TenantMiddleware - No valid tenant found or inactive');
      throw new UnauthorizedException('Invalid or inactive tenant');
    }

    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;

    (req as any).tenantContext = {
      tenantId: String(tenant.id),
      dbUrl,
    };

    console.log('TenantMiddleware - Set tenant context:', tenant.id);
    next();
  }
}