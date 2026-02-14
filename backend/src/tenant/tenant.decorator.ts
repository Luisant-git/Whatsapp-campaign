import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  tenantId: string;
  dbUrl: string;
}

export const TenantContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantContext;
  },
);
