import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class SubUserMenuPermissionService {
  constructor(private readonly prisma: CentralPrismaService) {}

  // ── verify subuser belongs to tenant ──
  private async verifySubUser(tenantId: number, subUserId: number) {
    const subUser = await this.prisma.subUser.findFirst({
      where: { id: subUserId, tenantId },
    });

    if (!subUser) {
      throw new NotFoundException(
        'SubUser not found or does not belong to this tenant',
      );
    }

    return subUser;
  }

  // ── validate against tenant permissions ──
  private async validateAgainstTenant(
    tenantId: number,
    permission: Record<string, boolean>,
  ) {
    // 1. Check tenant's subscription menuPermissions
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    let tenantAllowedKeys: string[] = [];

    if (tenant?.subscription?.menuPermissions?.length) {
      tenantAllowedKeys = tenant.subscription.menuPermissions;
    } else {
      // fallback: check tenant's own MenuPermission record
      const tenantMenu = await this.prisma.menuPermission.findUnique({
        where: { tenantId },
      });

      if (!tenantMenu) {
        throw new BadRequestException(
          'Tenant menu permissions not configured yet',
        );
      }

      const tenantPerm = tenantMenu.permission as Record<string, boolean>;
      tenantAllowedKeys = Object.keys(tenantPerm).filter(
        (key) => tenantPerm[key] === true,
      );
    }

    // 2. Check violations
    const violations: string[] = [];

    for (const [module, value] of Object.entries(permission)) {
      if (value === true && !tenantAllowedKeys.includes(module)) {
        violations.push(`"${module}" is not enabled for your tenant`);
      }
    }

    if (violations.length > 0) {
      throw new ForbiddenException(violations.join('; '));
    }
  }

  // ── UPSERT (create or update) ──
  async createOrUpdate(
    tenantId: number,
    subUserId: number,
    permission: Record<string, boolean>,
  ) {
    await this.verifySubUser(tenantId, subUserId);
    await this.validateAgainstTenant(tenantId, permission);

    return this.prisma.subUserMenuPermission.upsert({
      where: { subUserId },
      create: { subUserId, permission },
      update: { permission },
    });
  }

  // ── GET single subuser permission ──
  async findBySubUser(tenantId: number, subUserId: number) {
    await this.verifySubUser(tenantId, subUserId);

    const data = await this.prisma.subUserMenuPermission.findUnique({
      where: { subUserId },
    });

    if (!data) {
      return { subUserId, permission: {} };
    }

    return data;
  }

  // ── GET all subusers permissions for a tenant ──
  async findAllByTenant(tenantId: number) {
    const subUsers = await this.prisma.subUser.findMany({
      where: { tenantId },
      include: { menuPermission: true },
    });

    return subUsers.map((su) => ({
      subUserId: su.id,
      email: su.email,
      mobileNumber: su.mobileNumber,
      designation: su.designation,
      role: su.role,
      isActive: su.isActive,
      permission: (su.menuPermission as any)?.permission || null,
    }));
  }

  // ── GET effective permission (tenant ∩ subuser) ──
  async getEffectivePermission(tenantId: number, subUserId: number) {
    await this.verifySubUser(tenantId, subUserId);

    // Get tenant allowed keys
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    let tenantPermMap: Record<string, boolean> = {};

    if (tenant?.subscription?.menuPermissions?.length) {
      tenant.subscription.menuPermissions.forEach((key) => {
        tenantPermMap[key] = true;
      });
    } else {
      const tenantMenu = await this.prisma.menuPermission.findUnique({
        where: { tenantId },
      });
      if (tenantMenu) {
        tenantPermMap = tenantMenu.permission as Record<string, boolean>;
      }
    }

    // Get subuser permission
    const subUserMenu = await this.prisma.subUserMenuPermission.findUnique({
      where: { subUserId },
    });

    const subUserPerm = (subUserMenu?.permission || {}) as Record<
      string,
      boolean
    >;

    // Merge: only TRUE if BOTH have it
    const effective: Record<string, boolean> = {};
    for (const [module, tenantValue] of Object.entries(tenantPermMap)) {
      effective[module] =
        tenantValue === true && subUserPerm[module] === true;
    }

    return { subUserId, tenantId, permission: effective };
  }

  // ── DELETE ──
  async delete(tenantId: number, subUserId: number) {
    await this.verifySubUser(tenantId, subUserId);

    const existing = await this.prisma.subUserMenuPermission.findUnique({
      where: { subUserId },
    });

    if (!existing) {
      throw new NotFoundException(
        'No permissions found for this subuser',
      );
    }

    await this.prisma.subUserMenuPermission.delete({
      where: { subUserId },
    });

    return { message: 'SubUser permissions deleted successfully' };
  }
}