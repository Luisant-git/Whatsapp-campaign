# Database-Per-Tenant Refactoring Guide

## Current Status

Your backend has:
- ✅ Central DB (schema-central.prisma) - Admin, Tenant, Subscriptions
- ✅ Tenant DB (schema-tenant.prisma) - All WhatsApp/Campaign data
- ✅ TenantPrismaService - Manages tenant connections
- ✅ CentralPrismaService - Manages central connection

## Services Already Refactored

✅ AutoReplyService - Uses tenant DB
✅ QuickReplyService - Uses tenant DB  
✅ SettingsService - Uses tenant DB
✅ WhatsappSessionService - Uses central DB for tenant lookup

## Services Still Need Refactoring (49 errors)

These services use `PrismaService` but need tenant data:

❌ whatsapp/campaign.service.ts (25 errors)
❌ whatsapp/whatsapp.service.ts (20 errors)
❌ whatsapp/scheduler.service.ts (3 errors)
❌ whatsapp-session/whatsapp-session.service.ts (1 error)

Plus ALL other services that access tenant data:
- analytics/analytics.service.ts
- chatbot/chatbot.service.ts
- contact/contact.service.ts
- group/group.service.ts
- master-config/master-config.service.ts

## Quick Solution

Since you have 49+ errors across multiple services, here's the FASTEST approach:

### Option 1: Use Helper Service (Recommended - 5 minutes)

Create a base service that all tenant services extend:

```typescript
// src/base-tenant.service.ts
import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';
import { CentralPrismaService } from './central-prisma.service';

@Injectable()
export class BaseTenantService {
  constructor(
    protected tenantPrisma: TenantPrismaService,
    protected centralPrisma: CentralPrismaService,
  ) {}

  protected async getTenantDb(userId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: userId },
    });
    if (!tenant) throw new Error('Tenant not found');
    
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    return this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
  }
}
```

Then each service extends it:
```typescript
export class CampaignService extends BaseTenantService {
  async getCampaigns(userId: number) {
    const db = await this.getTenantDb(userId);
    return db.campaign.findMany();
  }
}
```

### Option 2: Global Tenant Context (10 minutes)

Use middleware to inject tenant DB into request:

```typescript
// Middleware adds tenantDb to request
req.tenantDb = tenantPrismaClient;

// Services use it
async getCampaigns(req: Request) {
  return req.tenantDb.campaign.findMany();
}
```

### Option 3: Refactor All Services (2+ hours)

Manually update each service like we did with SettingsService.

## Recommendation

Use **Option 1** - Create BaseTenantService and have all services extend it. This is the cleanest and fastest solution.

Would you like me to implement Option 1?
