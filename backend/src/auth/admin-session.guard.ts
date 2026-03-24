import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
  } from '@nestjs/common';
  import { CentralPrismaService } from '../central-prisma.service';
  
  @Injectable()
  export class AdminSessionGuard implements CanActivate {
    constructor(private prisma: CentralPrismaService) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
  
      // 🔥 Allow preflight requests
      if (request.method === 'OPTIONS') {
        return true;
      }
  
      const session = request.session;
  
      console.log('=== ADMIN SESSION GUARD ===');
      console.log('cookies:', request.get('cookie'));
      console.log('sessionID:', request.sessionID);
      console.log('session:', session);
  
      if (!session || !session.adminId) {
        throw new UnauthorizedException('Admin not authenticated');
      }
  
      const admin = await this.prisma.admin.findUnique({
        where: { id: Number(session.adminId) },
        select: { id: true, email: true },
      });
  
      if (!admin) {
        throw new UnauthorizedException('Invalid admin session');
      }
  
      return true;
    }
  }