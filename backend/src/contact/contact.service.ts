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
  
    const existing = await prisma.contact.findFirst({ 
      where: { 
        phone,
        phoneNumberId: data.phoneNumberId || null
      } 
    });
    if (existing) {
      throw new NotFoundException('Contact with this phone number already exists for this WhatsApp number');
    }
  
    const groupId = data.groupId ? Number(data.groupId) : undefined;
  
    return prisma.contact.create({
      data: {
        name: data.name,
        phone,
        email: data.email,
        place: data.place,
        dob: data.dob ? new Date(data.dob) : null,
        anniversary: data.anniversary ? new Date(data.anniversary) : null,
        phoneNumberId: data.phoneNumberId || null,
  
        // ✅ only connect if groupId exists
        ...(groupId ? { group: { connect: { id: groupId } } } : {}),
      },
      include: { group: true },
    });
  }
  async findAll(
    tenantContext: TenantContext,
    page = 1,
    limit = 10,
    search = '',
    groupId?: number,
  ) {
    const prisma = this.getPrisma(tenantContext);
  
    const blockedLabels = await prisma.chatLabel.findMany({
      where: {
        labels: { hasSome: ['Stop', 'stop'] },
      },
      select: { phone: true },
    });
  
    const blockedPhones = blockedLabels.map((b) => b.phone);
  
    const where: any = {
      isActive: true,
      phone: {
        notIn: blockedPhones.length ? blockedPhones : [''],
      },
    };
  
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim() } },
      ];
    }
  
    if (groupId !== undefined && groupId !== null) {
      where.groupId = groupId;
    }
  
    // 🔥 fetch all ordered contacts
    const contacts = await prisma.contact.findMany({
      where,
      include: { group: true },
      orderBy: { createdAt: 'desc' },
    });
  
    // 🔥 remove duplicates by phone
    const uniqueMap = new Map<string, any>();
  
    for (const contact of contacts) {
      if (!uniqueMap.has(contact.phone)) {
        uniqueMap.set(contact.phone, contact);
      }
    }
  
    const uniqueContacts = Array.from(uniqueMap.values());
  
    const total = uniqueContacts.length;
  
    // 🔥 manual pagination AFTER deduplication
    const paginated = uniqueContacts.slice(
      (page - 1) * limit,
      page * limit,
    );
  
    return {
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async getContactsByGroup(groupId: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.contact.findMany({
      where: { groupId, isActive: true }, // ✅
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
  
    const updateData: any = {
      name: data.name,
      email: data.email,
      place: data.place,
      dob: data.dob ? new Date(data.dob) : null,
      anniversary: data.anniversary ? new Date(data.anniversary) : null,
    };
  
    // ✅ only update phone if provided
    if (data.phone) {
      updateData.phone = this.formatPhoneNumber(data.phone);
    }
  
    // ✅ update group by groupId if provided
    if (data.groupId) {
      updateData.group = { connect: { id: Number(data.groupId) } };
      // OR updateData.groupId = Number(data.groupId);
    }
  
    return prisma.contact.update({
      where: { id },
      data: updateData,
      include: { group: true }, // ✅
    });
  }


  // ✅ THESE MUST BE HERE, INSIDE CLASS
 async findTrash(tenantContext: TenantContext) {
  const prisma = this.getPrisma(tenantContext);
  return prisma.contact.findMany({
    where: { isActive: false },
    orderBy: { updatedAt: 'desc' },
    include: { group: { select: { name: true } } },
  });
}

async restore(id: number, tenantContext: TenantContext) {
  const prisma = this.getPrisma(tenantContext);
  return prisma.contact.update({
    where: { id },
    data: { isActive: true },
  });
}
async remove(id: number, tenantContext: TenantContext) {
  const prisma = this.getPrisma(tenantContext);

  return prisma.contact.update({
    where: { id },
    data: { isActive: false },
  });
}

  async updateDeliveryStatus(
    phone: string,
    status: string,
    campaignName: string,
    name: string,
    tenantContext: TenantContext,
    phoneNumberId?: string,
  ) {
    const prisma = this.getPrisma(tenantContext);
    await prisma.contact.upsert({
      where: { 
        phone_phoneNumberId: { 
          phone, 
          phoneNumberId: (phoneNumberId ?? null) as any 
        } 
      },
      update: {
        name: name || phone,
        lastMessageDate: new Date(),
      },
      create: {
        name: name || phone,
        phone,
        phoneNumberId: (phoneNumberId ?? null) as any,
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

  async getCustomLabels(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const config = await prisma.tenantConfig.findFirst();
    return config?.customLabels || [];
  }

  async updateCustomLabels(tenantContext: TenantContext, labels: string[]) {
    const prisma = this.getPrisma(tenantContext);
    
    // Get or create tenant config
    const existingConfig = await prisma.tenantConfig.findFirst();
    
    if (existingConfig) {
      await prisma.tenantConfig.update({
        where: { id: existingConfig.id },
        data: { customLabels: labels },
      });
    } else {
      await prisma.tenantConfig.create({
        data: { customLabels: labels },
      });
    }
    
    return { success: true, customLabels: labels };
  }

//for ungrouped contactincoming new contact

async getNewContacts(
  tenantContext: TenantContext,
  page = 1,
  limit = 10,
  search?: string,
) {
  const prisma = this.getPrisma(tenantContext);

  // ✅ 1) Get blocked phones (same logic as findAll)
  const blockedLabels = await prisma.chatLabel.findMany({
    where: {
      labels: { hasSome: ['Stop', 'stop'] },
    },
    select: { phone: true },
  });

  const blockedPhones = blockedLabels.map((b) => b.phone);

  // ✅ 2) Base where for "new/ungrouped" contacts + block filter
  const where: any = {
    isActive: true,
    groupId: null,
    lastMessageDate: { not: null },   // only contacts with messages
    phone: {
      notIn: blockedPhones.length ? blockedPhones : [''],
    },
  };

  // optional search
  if (search?.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { phone: { contains: search.trim() } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { lastMessageDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
}
