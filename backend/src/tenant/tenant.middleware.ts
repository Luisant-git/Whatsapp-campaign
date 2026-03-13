import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private centralPrisma: CentralPrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const session: any = (req as any).session;
    const host = req.get('host') || req.hostname;

    let tenant = null;

    // First, try to identify tenant by custom domain
    if (host && host !== 'whatsapp.luisant.cloud' && host !== 'localhost:3010') {
      tenant = await this.centralPrisma.tenant.findFirst({
        where: { 
          domain: {
            contains: host,
            mode: 'insensitive'
          },
          isActive: true
        },
      });
    }

    // If no tenant found by domain, try session-based identification
    if (!tenant) {
      const tenantIdRaw = session?.tenantId ?? session?.userId;
      const tenantId = Number(tenantIdRaw);

      if (!tenantId || !Number.isFinite(tenantId)) {
        throw new UnauthorizedException('No tenant context');
      }

      tenant = await this.centralPrisma.tenant.findUnique({
        where: { id: tenantId },
      });
    }

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Invalid or inactive tenant');
    }

    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;

    (req as any).tenantContext = {
      tenantId: String(tenant.id),
      dbUrl,
    };

    next();
  }
}