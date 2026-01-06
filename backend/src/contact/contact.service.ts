import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, userId: number) {
    // Format phone number
    const phone = this.formatPhoneNumber(data.phone);
    
    // Check if contact already exists
    const existing = await this.prisma.contact.findFirst({
      where: { phone, userId }
    });
    
    if (existing) {
      throw new NotFoundException('Contact with this phone number already exists');
    }
    
    return this.prisma.contact.create({
      data: { ...data, phone, userId },
    });
  }

  private formatPhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // Always add 91 prefix for 10 digit numbers
    if (cleanPhone.length === 10) {
      return `91${cleanPhone}`;
    }
    
    return cleanPhone;
  }

  async findAll(
    userId: number,
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ) {
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { group: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data: contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, userId: number) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, userId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(id: number, data: any, userId: number) {
    await this.findOne(id, userId);
    return this.prisma.contact.update({
      where: { id },
      data,
    });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId);
    return this.prisma.contact.delete({
      where: { id },
    });
  }

  async getDeliveryStats(userId: number) {
    const total = await this.prisma.contact.count({
      where: { userId },
    });
    return { delivered: 0, failed: 0, pending: 0 };
  }

  async updateDeliveryStatus(
    phone: string,
    status: string,
    campaignName: string,
    name: string,
    userId: number,
  ) {
    await this.prisma.contact.upsert({
      where: {
        phone_userId: {
          phone,
          userId,
        },
      },
      update: {
        name: name || phone,
        lastMessageDate: new Date(),
      },
      create: {
        name: name || phone,
        phone,
        lastMessageDate: new Date(),
        userId,
      },
    });
  }

  async getGroups(userId: number) {
    const contacts = await this.prisma.contact.findMany({
      where: { userId, group: { not: null } },
      select: { group: true },
      distinct: ['group'],
    });
    return contacts.map(c => c.group).filter(Boolean);
  }

  async getLabels(userId: number) {
    const labels = await this.prisma.chatLabel.findMany({
      where: { userId },
    });
    const result = {};
    labels.forEach(label => {
      result[label.phone] = label.labels;
    });
    return result;
  }

  async getCustomLabels(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { customLabels: true },
    });
    return user?.customLabels || [];
  }

  async addCustomLabel(userId: number, label: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { customLabels: true },
    });
    const customLabels = user?.customLabels || [];
    if (!customLabels.includes(label)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { customLabels: [...customLabels, label] },
      });
    }
    return { success: true };
  }

  async deleteCustomLabel(userId: number, label: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { customLabels: true },
    });
    const customLabels = (user?.customLabels || []).filter(l => l !== label);
    await this.prisma.user.update({
      where: { id: userId },
      data: { customLabels },
    });
    // Remove label from all chats
    const chatLabels = await this.prisma.chatLabel.findMany({
      where: { userId },
    });
    for (const chat of chatLabels) {
      if (chat.labels.includes(label)) {
        await this.prisma.chatLabel.update({
          where: { id: chat.id },
          data: { labels: chat.labels.filter(l => l !== label) },
        });
      }
    }
    return { success: true };
  }

  async updateLabels(userId: number, phone: string, labels: string[]) {
    return this.prisma.chatLabel.upsert({
      where: {
        phone_userId: {
          phone,
          userId,
        },
      },
      update: { labels },
      create: { phone, labels, userId },
    });
  }
}
