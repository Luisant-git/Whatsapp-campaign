// This file documents which services need tenant context
// These services will NOT work until updated to use TenantPrismaService

// Services that need TenantContext (user-specific data):
// - analytics.service.ts
// - auto-reply.service.ts  
// - chatbot.service.ts
// - group.service.ts
// - master-config.service.ts
// - quick-reply.service.ts
// - settings.service.ts
// - whatsapp.service.ts
// - campaign.service.ts
// - scheduler.service.ts (disabled)
// - whatsapp-session.service.ts

// Pattern to update:
// 1. Replace: import { PrismaService } from '../prisma.service';
//    With: import { TenantPrismaService } from '../tenant-prisma.service';
//
// 2. Replace: constructor(private prisma: PrismaService)
//    With: constructor(private tenantPrisma: TenantPrismaService)
//
// 3. Add method: private getPrisma(ctx: TenantContext) {
//      return this.tenantPrisma.getTenantClient(ctx.tenantId, ctx.dbUrl);
//    }
//
// 4. Update all methods to accept TenantContext parameter
// 5. Use: const prisma = this.getPrisma(tenantContext);
// 6. Remove userId from queries

export const SERVICES_TO_UPDATE = [
  'analytics',
  'auto-reply',
  'chatbot', 
  'group',
  'master-config',
  'quick-reply',
  'settings',
  'whatsapp',
];
