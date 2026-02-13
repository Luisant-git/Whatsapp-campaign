import { Injectable, ConflictException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { TenantContext } from '../tenant/tenant.decorator';
import { CreateMasterConfigDto, UpdateMasterConfigDto } from './dto/master-config.dto';

@Injectable()
export class MasterConfigService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private getPrisma(ctx: TenantContext) {
    return this.tenantPrisma.getTenantClient(ctx.tenantId, ctx.dbUrl);
  }

  async create(createDto: CreateMasterConfigDto, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.create({
      data: {
        ...createDto,
        isActive: createDto.isActive ?? true,
      },
    });
  }

  async findAll(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateDto: UpdateMasterConfigDto, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.delete({
      where: { id },
    });
  }
}