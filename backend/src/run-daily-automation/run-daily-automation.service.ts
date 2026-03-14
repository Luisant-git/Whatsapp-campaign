import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import { TenantPrismaService } from '../tenant-prisma.service';
import type { TenantContext as TenantContextType } from '../tenant/tenant.decorator';
import { CreateRunDailyAutomationDto } from './dto/create-run-daily-automation.dto';
import { ListRunDailyAutomationLogsQueryDto } from './dto/list-run-daily-automation-logs.query';
import { BulkEnableAutomationDto } from './dto/bulk-enable-automation.dto';
import { DisableAutomationTypeDto } from './dto/disable-automation-type.dto';

@Injectable()
export class RunDailyAutomationService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private prisma(ctx: TenantContextType): TenantPrismaClient {
    return this.tenantPrisma.getTenantClient(ctx.tenantId, ctx.dbUrl);
  }

  private validateOverride(dto: CreateRunDailyAutomationDto) {
    const hasDob = !!dto.dob && String(dto.dob).trim() !== '';
    const hasAnn = !!dto.anniversary && String(dto.anniversary).trim() !== '';

    // cannot provide both
    if (hasDob && hasAnn) {
      throw new BadRequestException('Provide only one override date: dob OR anniversary');
    }

    // if override is provided, it must match eventType
    if (dto.eventType === 'DOB' && hasAnn) {
      throw new BadRequestException('For eventType DOB, do not provide anniversary override');
    }
    if (dto.eventType === 'ANNIVERSARY' && hasDob) {
      throw new BadRequestException('For eventType ANNIVERSARY, do not provide dob override');
    }
  }

  async list(ctx: TenantContextType) {
    const prisma = this.prisma(ctx);
    return prisma.runDailyAutomation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        contact: { select: { id: true, name: true, phone: true, dob: true, anniversary: true } },
        whatsAppSettings: { select: { id: true, name: true, templateName: true, language: true, phoneNumberId: true } },
      },
    });
  }

  async create(dto: CreateRunDailyAutomationDto, ctx: TenantContextType) {
    const prisma = this.prisma(ctx);

    this.validateOverride(dto);

    await prisma.whatsAppSettings.findUniqueOrThrow({
      where: { id: Number(dto.whatsAppSettingsId) },
    });

    // fetch contact so we can ensure the event date exists (either override or contact field)
    const contact = await prisma.contact.findUniqueOrThrow({
      where: { id: Number(dto.contactId) },
      select: { id: true, dob: true, anniversary: true },
    });

    const overrideDob = dto.eventType === 'DOB' && dto.dob ? new Date(dto.dob) : null;
    const overrideAnn = dto.eventType === 'ANNIVERSARY' && dto.anniversary ? new Date(dto.anniversary) : null;

    const effectiveDate =
      dto.eventType === 'DOB'
        ? (overrideDob ?? contact.dob)
        : (overrideAnn ?? contact.anniversary);

    if (!effectiveDate) {
      throw new BadRequestException(`Contact does not have ${dto.eventType} date and no override was provided`);
    }

    return prisma.runDailyAutomation.create({
      data: {
        whatsAppSettingsId: Number(dto.whatsAppSettingsId),
        contactId: Number(dto.contactId),
        eventType: dto.eventType,              // ✅ REQUIRED
        dayBefore: Number(dto.dayBefore),

        // store override (optional)
        dob: overrideDob,
        anniversary: overrideAnn,
      },
    });
  }

  async remove(id: number, ctx: TenantContextType) {
    const prisma = this.prisma(ctx);
    return prisma.runDailyAutomation.delete({ where: { id } });
  }
  async listLogs(ctx: TenantContextType, q: ListRunDailyAutomationLogsQueryDto) {
    const prisma = this.prisma(ctx);
  
    const page = Math.max(1, Number(q.page || 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit || 20)));
    const skip = (page - 1) * limit;
  
    const where: any = {};
  
    if (q.status) where.status = q.status;
  
    // ✅ filter by eventType via relation
    if (q.type) {
      where.runDailyAutomation = { is: { eventType: q.type } };
    }
  
    const [total, data] = await Promise.all([
      prisma.runDailyAutomationLog.count({ where }),
      prisma.runDailyAutomationLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
        include: {
          contact: { select: { id: true, name: true, phone: true } },
          whatsAppSettings: { select: { id: true, name: true, templateName: true, language: true } },
          runDailyAutomation: { select: { id: true, eventType: true, dayBefore: true, dob: true, anniversary: true } },
        },
      }),
    ]);
  
    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
  async logsStats(ctx: TenantContextType, q: ListRunDailyAutomationLogsQueryDto) {
    const prisma = this.prisma(ctx);
  
    const where: any = {};
    if (q.status) where.status = q.status;
  
    // optional: if you added q.type in DTO (DOB | ANNIVERSARY)
    if ((q as any).type) {
      where.runDailyAutomation = { is: { eventType: (q as any).type } };
    }
  
    const grouped = await prisma.runDailyAutomationLog.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });
  
    const sent = grouped.find((g) => g.status === "sent")?._count._all ?? 0;
    const failed = grouped.find((g) => g.status === "failed")?._count._all ?? 0;
  
    // total for same filters
    const total = await prisma.runDailyAutomationLog.count({ where });
  
    return { total, sent, failed };
  }
  async bulkEnable(dto: BulkEnableAutomationDto, ctx: TenantContextType) {
    const prisma = this.prisma(ctx);
  
    await prisma.whatsAppSettings.findUniqueOrThrow({
      where: { id: Number(dto.whatsAppSettingsId) },
      select: { id: true },
    });
  
    const contacts = await prisma.contact.findMany({
      where:
        dto.eventType === 'DOB'
          ? { dob: { not: null }, isActive: true }
          : { anniversary: { not: null }, isActive: true },
      select: { id: true, dob: true, anniversary: true },
    });
  
    if (contacts.length === 0) {
      throw new BadRequestException(`No contacts found with ${dto.eventType}`);
    }
  
    const data = contacts.map((c) => ({
      whatsAppSettingsId: Number(dto.whatsAppSettingsId),
      contactId: c.id,
      eventType: dto.eventType,
      dayBefore: Number(dto.dayBefore),
      // keep overrides empty OR store from contact (either is fine)
      dob: dto.eventType === 'DOB' ? c.dob : null,
      anniversary: dto.eventType === 'ANNIVERSARY' ? c.anniversary : null,
    }));
  
    const result = await prisma.runDailyAutomation.createMany({
      data,
      skipDuplicates: true, // works because of @@unique([contactId, whatsAppSettingsId, eventType, dayBefore])
    });
  
    return { created: result.count, eligible: contacts.length };
  }

    // ✅ SUMMARY ENDPOINT DATA (for UI tabs/badges)
    async summary(ctx: TenantContextType) {
      const prisma = this.prisma(ctx);
  
      const grouped = await prisma.runDailyAutomation.groupBy({
        by: ['whatsAppSettingsId', 'eventType', 'dayBefore'],
        _count: { _all: true },
      });
  
      // simple shape (frontend needs this)
      return grouped.map((g) => ({
        whatsAppSettingsId: g.whatsAppSettingsId,
        eventType: g.eventType,   // 'DOB' | 'ANNIVERSARY'
        dayBefore: g.dayBefore,   // 7 / 0 / -7 ...
        count: g._count._all,
      }));
    }

    
async disableType(dto: DisableAutomationTypeDto, ctx: TenantContextType) {
  const prisma = this.prisma(ctx);

  const res = await prisma.runDailyAutomation.deleteMany({
    where: {
      whatsAppSettingsId: Number(dto.whatsAppSettingsId),
      eventType: dto.eventType,
      dayBefore: Number(dto.dayBefore),
    },
  });

  return { deleted: res.count };
}
}