import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private tenantCache: Map<number, { tenant: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000;

  constructor(private centralPrisma: CentralPrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = (req.session as any)?.userId;
    
    if (!tenantId) {
      throw new UnauthorizedException('No tenant context');
    }

    let tenant;
    const cached = this.tenantCache.get(tenantId);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      tenant = cached.tenant;
    } else {
      tenant = await this.centralPrisma.tenant.findUnique({
        where: { id: tenantId },
      });
      
      if (tenant) {
        this.tenantCache.set(tenantId, { tenant, timestamp: Date.now() });
      }
    }

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Invalid or inactive tenant');
    }

    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?connection_limit=10&pool_timeout=20`;
    
    req['tenantContext'] = {
      tenantId: tenant.id.toString(),
      dbUrl,
    };

    next();
  }
}
