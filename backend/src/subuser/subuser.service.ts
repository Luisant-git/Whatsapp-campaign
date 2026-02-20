import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { TenantContext } from '../tenant/tenant.decorator';

import { CreateSubuserDto } from './dto/create-subuser.dto';
import { UpdateSubuserDto } from './dto/update-subuser.dto';

@Injectable()
export class SubuserService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {}

  private getPrisma(ctx: TenantContext) {
    return this.tenantPrisma.getTenantClient(ctx.tenantId, ctx.dbUrl);
  }

  // ✅ CREATE SUBUSER
  async create(dto: CreateSubuserDto, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const tenantId = Number(tenantContext.tenantId);

    // 1️⃣ Get active subscription
    const subscription = await this.centralPrisma.subscriptionOrder.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new ForbiddenException('No active subscription found');
    }

    // 2️⃣ Check expiry
    if (subscription.endDate < new Date()) {
      throw new ForbiddenException('Subscription expired');
    }

    // 3️⃣ Validate userLimit (handle null safely)
    const limit = subscription.plan.userLimit;

    if (limit === null) {
      throw new ForbiddenException(
        'User limit not configured for this subscription plan',
      );
    }

    // 4️⃣ Count existing sub users
    const currentCount = await prisma.subUser.count();

    // Unlimited support (-1 = unlimited)
    if (limit !== -1 && currentCount >= limit) {
      throw new ForbiddenException(
        `User limit exceeded. Maximum allowed users: ${limit}`,
      );
    }

    // 5️⃣ Unique mobile check
    const existing = await prisma.subUser.findUnique({
      where: { mobileNumber: dto.mobileNumber },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Mobile number already exists');
    }

    // 6️⃣ Create sub user
    return prisma.subUser.create({
      data: {
        username: dto.username,
        mobileNumber: dto.mobileNumber,
        designation: dto.designation ?? null,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        username: true,
        mobileNumber: true,
        designation: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  // ✅ GET ALL SUB USERS
  async findAll(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);

    return prisma.subUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        mobileNumber: true,
        designation: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  // ✅ UPDATE SUB USER
  async update(
    id: number,
    dto: UpdateSubuserDto,
    tenantContext: TenantContext,
  ) {
    const prisma = this.getPrisma(tenantContext);

    const exists = await prisma.subUser.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Sub user not found');
    }

    if (dto.mobileNumber) {
      const mobileExists = await prisma.subUser.findUnique({
        where: { mobileNumber: dto.mobileNumber },
        select: { id: true },
      });

      if (mobileExists && mobileExists.id !== id) {
        throw new ConflictException('Mobile number already exists');
      }
    }

    return prisma.subUser.update({
      where: { id },
      data: {
        username: dto.username,
        mobileNumber: dto.mobileNumber,
        designation:
          dto.designation === undefined ? undefined : dto.designation,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        username: true,
        mobileNumber: true,
        designation: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // ✅ DELETE SUB USER
  async remove(id: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);

    const exists = await prisma.subUser.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Sub user not found');
    }

    return prisma.subUser.delete({
      where: { id },
    });
  }

  // ✅ GET USAGE INFO (for dashboard)
  async getUsageInfo(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const tenantId = Number(tenantContext.tenantId);

    const subscription = await this.centralPrisma.subscriptionOrder.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new ForbiddenException('No active subscription found');
    }

    const limit = subscription.plan.userLimit;

    if (limit === null) {
      throw new ForbiddenException(
        'User limit not configured for this subscription plan',
      );
    }

    const used = await prisma.subUser.count();

    return {
      usedUsers: used,
      userLimit: limit,
      remaining:
        limit === -1 ? 'Unlimited' : Math.max(limit - used, 0),
      planName: subscription.plan.name,
      expiryDate: subscription.endDate,
    };
  }
}
