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
    const host = request.get('host') || request.hostname;

    // Check if accessing via custom domain
    let tenant = null;
    if (host && host !== 'whatsapp.luisant.cloud' && host !== 'localhost:3010') {
      tenant = await this.prisma.tenant.findFirst({
        where: { 
          domain: {
            contains: host,
            mode: 'insensitive'
          },
          isActive: true
        },
      });

      // For domain-based access, we need to check if user is authenticated for this specific tenant
      if (tenant && session && (session.tenantId || session.userId)) {
        const sessionTenantId = Number(session.tenantId || session.userId);
        
        // If session tenant doesn't match domain tenant, clear session
        if (sessionTenantId !== tenant.id) {
          session.destroy();
          throw new UnauthorizedException('Please login to access this domain');
        }
      }
    }

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