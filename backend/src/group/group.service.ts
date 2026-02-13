import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { TenantContext } from '../tenant/tenant.decorator';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private getPrisma(ctx: TenantContext) {
    return this.tenantPrisma.getTenantClient(ctx.tenantId, ctx.dbUrl);
  }

  async create(createGroupDto: CreateGroupDto, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    if (!createGroupDto.name || !createGroupDto.name.trim()) {
      throw new Error('Group name is required');
    }

    return prisma.group.create({
      data: {
        name: createGroupDto.name.trim(),
      },
    });
  }

  async findAll(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const group = await prisma.group.findUnique({
      where: { id },
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async update(id: number, name: string, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const group = await this.findOne(id, tenantContext);
    return prisma.group.update({
      where: { id: group.id },
      data: { name: name.trim() },
    });
  }

  async remove(id: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const group = await this.findOne(id, tenantContext);
    return prisma.group.delete({ where: { id: group.id } });
  }
}
