import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import type { TenantContext } from '../tenant/tenant.decorator';

@Injectable()
export class CategoryService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private getPrisma(ctx: TenantContext) {
    return this.tenantPrisma.getTenantClient(ctx.tenantId, ctx.dbUrl);
  }

  async create(dto: any, ctx: TenantContext) {
    const prisma = this.getPrisma(ctx);

    return prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
        isactive: true,
      },
    });
  }

  async findAll(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
  
    return prisma.category.findMany({
      where: {
        isactive: true, // important for soft delete
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  
 
  async findOne(id: number, ctx: TenantContext) {
    const prisma = this.getPrisma(ctx);

    return prisma.category.findFirst({
      where: { id, isactive: true },
    });
  }

  async update(id: number, dto: any, ctx: TenantContext) {
    const prisma = this.getPrisma(ctx);

    return prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: number, ctx: TenantContext) {
    const prisma = this.getPrisma(ctx);

    return prisma.category.update({
      where: { id },
      data: { isactive: false },
    });
  }
}
