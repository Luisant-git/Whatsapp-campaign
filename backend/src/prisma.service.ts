import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '@prisma/client-tenant';
import { TenantPrismaService } from './tenant-prisma.service';
import { CentralPrismaService } from './central-prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class PrismaService {
  private client: PrismaClient;

  constructor(
    @Inject(REQUEST) private request: any,
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {
    this.initializeClient();
  }

  private initializeClient() {
    const tenantContext = this.request.tenantContext;
    
    if (tenantContext) {
      // Use tenant-specific database from middleware
      this.client = this.tenantPrisma.getTenantClient(
        tenantContext.tenantId,
        tenantContext.dbUrl
      );
      console.log(`PrismaService initialized for tenant: ${tenantContext.tenantId}`);
    } else {
      console.warn('PrismaService initialized without tenant context. Session:', this.request.session?.userId);
    }
  }

  // Override all Prisma client properties to use the tenant-specific client
  get whatsAppSettings() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.whatsAppSettings;
  }

  get campaign() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.campaign;
  }

  get campaignContact() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.campaignContact;
  }

  get campaignMessage() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.campaignMessage;
  }

  get group() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.group;
  }

  get contact() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.contact;
  }

  get chatLabel() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.chatLabel;
  }

  get whatsAppMessage() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.whatsAppMessage;
  }

  get masterConfig() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.masterConfig;
  }

  get document() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.document;
  }

  get chatSession() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.chatSession;
  }

  get chatMessage() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.chatMessage;
  }

  get autoReply() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.autoReply;
  }

  get quickReply() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.quickReply;
  }

  get tenantConfig() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.tenantConfig;
  }

  get category() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.category;
  }

  get subCategory() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.subCategory;
  }

  get product() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.product;
  }

  get order() {
    if (!this.client) {
      throw new Error('Tenant context not initialized. Make sure you are authenticated and the tenant middleware is enabled.');
    }
    return this.client.order;
  }
}
