import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { LabelsGateway } from '../labels/labels.gateway';
import { TenantContext } from '../tenant/tenant.decorator';

@Injectable()
export class ContactService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private labelsGateway: LabelsGateway,
  ) {}

  private getPrisma(tenantContext: TenantContext) {
    return this.tenantPrisma.getTenantClient(
      tenantContext.tenantId,
      tenantContext.dbUrl,
    );
  }

  private formatPhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      return `91${cleanPhone}`;
    }
    return cleanPhone;
  }

  async create(data: any, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const phone = this.formatPhoneNumber(data.phone);

    const existing = await prisma.contact.findUnique({
      where: { phone },
    });

    if (existing) {
      throw new NotFoundException('Contact with this phone number already exists');
    }

    const contactData: any = {
      name: data.name,
      phone,
      email: data.email,
      place: data.place,
      dob: data.dob ? new Date(data.dob) : null,
      anniversary: data.anniversary ? new Date(data.anniversary) : null,
    };

    if (data.group) {
      contactData.group = {
        connectOrCreate: {
          where: { name: data.group },
          create: { name: data.group },
        },
      };
    }

    return prisma.contact.create({ data: contactData });
  }

  async findAll(
    tenantContext: TenantContext,
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ) {
    const prisma = this.getPrisma(tenantContext);
    const skip = (page - 1) * limit;

    const stopLabeled = await prisma.chatLabel.findMany({
      where: { labels: { hasSome: ['Stop', 'stop'] } },
      select: { phone: true },
    });
    const stopPhones = stopLabeled.map((x) => x.phone);

    const where: any = {
      isActive: true, // ✅ only active contacts
      ...(stopPhones.length ? { phone: { notIn: stopPhones } } : {}),
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { group: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { group: { select: { name: true } } },
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      data: contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getContactsByGroup(groupId: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.contact.findMany({
      where: { groupId },
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
    });
  }

  async getBlocklistedContacts(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const labeled = await prisma.chatLabel.findMany({
      where: { labels: { hasSome: ['Stop', 'stop'] } },
      select: { phone: true },
    });

    if (labeled.length === 0) return [];

    const phones = labeled.map((l) => l.phone);
    return prisma.contact.findMany({
      where: { phone: { in: phones } },
      include: { group: true },
    });
  }

  async update(id: number, data: any, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const phone = this.formatPhoneNumber(data.phone);

    const updateData: any = {
      name: data.name,
      phone,
      email: data.email,
      place: data.place,
      dob: data.dob ? new Date(data.dob) : null,
      anniversary: data.anniversary ? new Date(data.anniversary) : null,
    };

    if (data.group) {
      updateData.group = {
        connectOrCreate: {
          where: { name: data.group },
          create: { name: data.group },
        },
      };
    }

    return prisma.contact.update({ where: { id }, data: updateData });
  }
 
  async remove(id: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
  
    return prisma.contact.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async updateDeliveryStatus(
    phone: string,
    status: string,
    campaignName: string,
    name: string,
    tenantContext: TenantContext,
  ) {
    const prisma = this.getPrisma(tenantContext);
    await prisma.contact.upsert({
      where: { phone },
      update: {
        name: name || phone,
        lastMessageDate: new Date(),
      },
      create: {
        name: name || phone,
        phone,
        lastMessageDate: new Date(),
      },
    });
  }

  
  
 
  async getLabels(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const labels = await prisma.chatLabel.findMany({});

    const result: Record<string, string[]> = {};
    labels.forEach((label) => {
      result[label.phone] = label.labels;
    });

    return result;
  }

  async updateLabels(
    phone: string,
    labels: string[],
    tenantContext: TenantContext,
  ) {
    const prisma = this.getPrisma(tenantContext);
    await prisma.chatLabel.upsert({
      where: { phone },
      update: { labels },
      create: { phone, labels },
    });

    this.labelsGateway.emitLabelUpdate(
      parseInt(tenantContext.tenantId),
      phone,
      labels,
    );
    return { success: true };
  }

  async removeLabel(
    phone: string,
    label: string,
    tenantContext: TenantContext,
  ) {
    const prisma = this.getPrisma(tenantContext);
    const chatLabel = await prisma.chatLabel.findUnique({ where: { phone } });

    if (!chatLabel) return { success: false };

    const updatedLabels = chatLabel.labels.filter(
      (l) => l.toLowerCase() !== label.toLowerCase(),
    );

    await prisma.chatLabel.update({
      where: { phone },
      data: { labels: updatedLabels, manuallyEdited: false },
    });

    this.labelsGateway.emitLabelUpdate(
      parseInt(tenantContext.tenantId),
      phone,
      updatedLabels,
    );
    return { success: true, message: 'Label removed successfully' };
  }
}
