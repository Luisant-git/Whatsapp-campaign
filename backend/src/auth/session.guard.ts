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

    // ✅ Validate tenant using tenantId (works for tenant + subuser)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: Number(session.tenantId) },
      select: { id: true, isActive: true },
    });

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Invalid or inactive tenant');
    }

    // ✅ If subuser session, also validate subuser
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