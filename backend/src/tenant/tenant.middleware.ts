import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private centralPrisma: CentralPrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const session: any = (req as any).session;

    // ✅ Always prefer tenantId (works for tenant + subuser)
    const tenantIdRaw = session?.tenantId ?? session?.userId; // fallback for older tenant sessions
    const tenantId = Number(tenantIdRaw);

    if (!tenantId || !Number.isFinite(tenantId)) {
      throw new UnauthorizedException('No tenant context');
    }

    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: tenantId },
    });

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