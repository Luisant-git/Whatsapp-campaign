import { Test, TestingModule } from '@nestjs/testing';
import { ContextIdFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TenantPrismaService } from './tenant-prisma.service';
import { CentralPrismaService } from './central-prisma.service';
import { PrismaService } from './prisma.service';
import { AdminService } from './admin/admin.service';
import { UserService } from './user/user.service';
import { SettingsService } from './settings/settings.service';
import { QuickReplyService } from './quick-reply/quick-reply.service';
import { TemplateService } from './template/template.service';
import { MetaLeadsService } from './meta-leads/meta-leads.service';
import { ContactService } from './contact/contact.service';
import { AnalyticsService } from './analytics/analytics.service';

describe('Global Provider Dependency Resolution', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    process.env.META_CREDENTIAL_SOURCE = 'CENTRAL';

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('should compile the entire AppModule DI graph without missing dependencies', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should resolve CentralPrismaService and TenantPrismaService as global singletons', () => {
    const centralPrisma = moduleRef.get<CentralPrismaService>(CentralPrismaService);
    const tenantPrisma = moduleRef.get<TenantPrismaService>(TenantPrismaService);

    expect(centralPrisma).toBeDefined();
    expect(tenantPrisma).toBeDefined();
  });

  it('should share the exact same TenantPrismaService instance across all feature services', () => {
    const globalTenantPrisma = moduleRef.get<TenantPrismaService>(TenantPrismaService);

    const adminService = moduleRef.get<AdminService>(AdminService);
    const userService = moduleRef.get<UserService>(UserService);
    const settingsService = moduleRef.get<SettingsService>(SettingsService);
    const quickReplyService = moduleRef.get<QuickReplyService>(QuickReplyService);
    const templateService = moduleRef.get<TemplateService>(TemplateService);
    const contactService = moduleRef.get<ContactService>(ContactService);
    const analyticsService = moduleRef.get<AnalyticsService>(AnalyticsService);

    // Verify each service received the exact same singleton instance
    expect((adminService as any).tenantPrisma).toBe(globalTenantPrisma);
    expect((userService as any).tenantPrisma).toBe(globalTenantPrisma);
    expect((settingsService as any).tenantPrisma).toBe(globalTenantPrisma);
    expect((quickReplyService as any).tenantPrisma).toBe(globalTenantPrisma);
    expect((templateService as any).tenantPrisma).toBe(globalTenantPrisma);
    expect((contactService as any).tenantPrisma).toBe(globalTenantPrisma);
    expect((analyticsService as any).tenantPrisma).toBe(globalTenantPrisma);
  });

  it('should share the exact same CentralPrismaService instance across all feature services', () => {
    const globalCentralPrisma = moduleRef.get<CentralPrismaService>(CentralPrismaService);

    const userService = moduleRef.get<UserService>(UserService);
    const metaLeadsService = moduleRef.get<MetaLeadsService>(MetaLeadsService);
    const settingsService = moduleRef.get<SettingsService>(SettingsService);
    const quickReplyService = moduleRef.get<QuickReplyService>(QuickReplyService);
    const templateService = moduleRef.get<TemplateService>(TemplateService);

    expect((userService as any).centralPrisma).toBe(globalCentralPrisma);
    expect((metaLeadsService as any).centralPrisma).toBe(globalCentralPrisma);
    expect((settingsService as any).centralPrisma).toBe(globalCentralPrisma);
    expect((quickReplyService as any).centralPrisma).toBe(globalCentralPrisma);
    expect((templateService as any).centralPrisma).toBe(globalCentralPrisma);
  });

  it('should correctly resolve request-scoped PrismaService per request context and link to global singletons', async () => {
    const contextId1 = ContextIdFactory.create();
    const contextId2 = ContextIdFactory.create();

    const prisma1 = await moduleRef.resolve<PrismaService>(PrismaService, contextId1);
    const prisma2 = await moduleRef.resolve<PrismaService>(PrismaService, contextId2);

    expect(prisma1).toBeDefined();
    expect(prisma2).toBeDefined();
    // Distinct request contexts get distinct PrismaService instances
    expect(prisma1).not.toBe(prisma2);
    // Both request-scoped wrappers resolve and share the identical global TenantPrismaService singleton
    expect((prisma1 as any).tenantPrisma).toBe(moduleRef.get(TenantPrismaService));
    expect((prisma2 as any).tenantPrisma).toBe(moduleRef.get(TenantPrismaService));
  });
});
