import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private prisma: CentralPrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = request.session;
    const origin = request.get('origin') || request.get('referer');
    const authHeader = request.get('authorization');

    // Check if accessing via custom domain (based on origin)
    let tenant: any = null;
    let isDomainBasedAccess = false;
    
    if (origin) {
      const originUrl = new URL(origin);
      const hostname = originUrl.hostname;
      
      if (hostname !== 'whatsapp.luisant.cloud' && hostname !== 'crm.luisant.in' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        tenant = await this.prisma.tenant.findFirst({
          where: { 
            domain: {
              contains: hostname,
              mode: 'insensitive'
            },
            isActive: true
          },
        });
        
        if (tenant) {
          isDomainBasedAccess = true;
          console.log('SessionGuard - Domain-based access for tenant:', tenant.id);
        }
      }
    }

    // For domain-based access, check for domain-specific auth token
    if (isDomainBasedAccess && tenant) {
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Simple token format: tenantId:timestamp:hash
        const [tenantIdStr, timestamp] = token.split(':');
        const tokenTenantId = parseInt(tenantIdStr);
        
        if (tokenTenantId === tenant.id) {
          // Token is valid for this tenant
          console.log('SessionGuard - Valid domain auth token for tenant:', tenant.id);
          return true;
        }
      }
      
      // No valid token for domain-based access
      throw new UnauthorizedException('Domain authentication required');
    }

    // For non-domain access, require session authentication
    if (!session || (!session.user && !session.userId)) {
      throw new UnauthorizedException('Not authenticated');
    }

    // Ensure tenantId exists
    if (!session.tenantId) {
      // backward compat: old tenant sessions
      if (session.userId && !session.userType) {
        session.tenantId = session.userId;
        session.userType = 'tenant';
      } else {
        throw new UnauthorizedException('Tenant context not found. Please login again.');
      }
    }

    // Validate tenant using tenantId (works for tenant + subuser)
    if (!tenant) {
      tenant = await this.prisma.tenant.findUnique({
        where: { id: Number(session.tenantId) },
        select: { id: true, isActive: true },
      });
    }

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Invalid or inactive tenant');
    }

    // If subuser session, also validate subuser
    if (session.userType === 'subuser') {
      const sub = await this.prisma.subUser.findUnique({
        where: { id: Number(session.userId) },
        select: { id: true, tenantId: true, isActive: true },
      });

      if (!sub || !sub.isActive || sub.tenantId !== tenant.id) {
        throw new UnauthorizedException('Invalid or inactive sub-user');
      }
    }

    return true;
  }
}