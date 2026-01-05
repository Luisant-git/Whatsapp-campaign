import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    console.log('COOKIE:', request.headers.cookie);
    console.log('SESSION:', request.session);
    console.log('SESSION USER:', request.session?.user);
    
    if (!request.session || !request.session.user) {
      throw new UnauthorizedException('Not authenticated');
    }
    
    return true;
  }
}