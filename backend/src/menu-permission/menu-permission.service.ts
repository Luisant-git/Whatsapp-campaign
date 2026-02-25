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

  async findByTenant(tenantId: number) {
    const data = await this.prisma.menuPermission.findUnique({
      where: { tenantId },
      include: { tenant: true },
    });

    if (!data) {
      throw new NotFoundException(
        'Menu permission not found for this tenant',
      );
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
    const exists = await this.prisma.menuPermission.findUnique({
      where: { tenantId },
    });

    if (!exists) {
      throw new NotFoundException(
        'Menu permission not found for this tenant',
      );
    }

    return this.prisma.menuPermission.update({
      where: { tenantId },
      data: { permission },
    });
  }
}