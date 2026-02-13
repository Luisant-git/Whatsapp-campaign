import { Injectable, OnModuleInit, OnModuleDestroy, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import { TenantPrismaService } from './tenant-prisma.service';
import { CentralPrismaService } from './central-prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client: TenantPrismaClient;

  constructor(
    @Inject(REQUEST) private request: any,
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {}

  async onModuleInit() {
    const userId = this.request.session?.userId;
    if (userId) {
      const tenant = await this.centralPrisma.tenant.findUnique({
        where: { id: userId },
      });
      if (tenant) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        this.client = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
      }
    }
  }

  async onModuleDestroy() {
    // Managed by TenantPrismaService
  }

  get whatsAppSettings() {
    return this.client?.whatsAppSettings;
  }

  get campaign() {
    return this.client?.campaign;
  }

  get campaignContact() {
    return this.client?.campaignContact;
  }

  get campaignMessage() {
    return this.client?.campaignMessage;
  }

  get group() {
    return this.client?.group;
  }

  get contact() {
    return this.client?.contact;
  }

  get chatLabel() {
    return this.client?.chatLabel;
  }

  get whatsAppMessage() {
    return this.client?.whatsAppMessage;
  }

  get masterConfig() {
    return this.client?.masterConfig;
  }

  get document() {
    return this.client?.document;
  }

  get chatSession() {
    return this.client?.chatSession;
  }

  get chatMessage() {
    return this.client?.chatMessage;
  }

  get autoReply() {
    return this.client?.autoReply;
  }

  get quickReply() {
    return this.client?.quickReply;
  }
}
