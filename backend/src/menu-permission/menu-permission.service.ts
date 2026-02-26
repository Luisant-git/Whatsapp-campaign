import { Injectable, NotFoundException } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class MenuPermissionService {
  constructor(
    private readonly prisma: CentralPrismaService,
  ) {}

  async createOrUpdate(
    tenantId: number,
    permission: Record<string, any>,
  ) {
    return this.prisma.menuPermission.upsert({
      where: { tenantId },
      update: { permission },
      create: {
        tenantId,
        permission,
      },
    });
  }

  // CHANGE HERE
  async findByTenant(tenantId: number) {
    const data = await this.prisma.menuPermission.findUnique({
      where: { tenantId },
      include: { tenant: true },
    });

    // If no record, return an "empty" one instead of throwing 404
    if (!data) {
      return {
        tenantId,
        tenant: null,
        permission: {},   // no permissions yet
      };
    }

    return data;
  }

  async findAll() {
    return this.prisma.menuPermission.findMany({
      include: { tenant: true },
    });
  }

  async update(
    tenantId: number,
    permission: Record<string, any>,
  ) {
    try {
      return await this.prisma.menuPermission.update({
        where: { tenantId },
        data: { permission },
      });
    } catch (error) {
      throw new NotFoundException(
        'Menu permission not found for this tenant',
      );
    }
  }
}