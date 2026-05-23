import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';

@Injectable()
export class MetaConfigService {
  private readonly logger = new Logger(MetaConfigService.name);

  constructor(private prisma: TenantPrismaService) {}

  private async getClient(tenantId: string, dbUrl?: string) {
    const url = dbUrl || process.env.TENANT_DATABASE_URL || '';
    return await this.prisma.getTenantClientReady(tenantId, url) as any;
  }

  async getAll(tenantId: string) {
    const client = await this.getClient(tenantId);
    return client.metaConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(tenantId: string, id: number) {
    const client = await this.getClient(tenantId);
    return client.metaConfig.findUnique({
      where: { id },
    });
  }

  async getActive(tenantId: string) {
    const client = await this.getClient(tenantId);
    return client.metaConfig.findFirst({
      where: { isActive: true },
    });
  }

  async create(tenantId: string, data: any) {
    const client = await this.getClient(tenantId);
    
    // If this is set as active, deactivate others
    if (data.isActive) {
      await client.metaConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    return client.metaConfig.create({
      data: {
        name: data.name,
        pageId: data.pageId,
        accessToken: data.accessToken,
        verifyToken: data.verifyToken || null,
        isActive: data.isActive !== false,
      },
    });
  }

  async update(tenantId: string, id: number, data: any) {
    const client = await this.getClient(tenantId);
    
    // If this is set as active, deactivate others
    if (data.isActive) {
      await client.metaConfig.updateMany({
        where: { 
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false },
      });
    }

    return client.metaConfig.update({
      where: { id },
      data: {
        name: data.name,
        pageId: data.pageId,
        accessToken: data.accessToken,
        verifyToken: data.verifyToken || null,
        isActive: data.isActive,
      },
    });
  }

  async delete(tenantId: string, id: number) {
    const client = await this.getClient(tenantId);
    return client.metaConfig.delete({
      where: { id },
    });
  }
}
