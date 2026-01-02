import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, userId: number) {
    return this.prisma.contact.create({
      data: { ...data, userId },
    });
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
        { lastCampaignName: { contains: search, mode: 'insensitive' } },
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
        lastCampaignName: campaignName,
      },
      create: {
        name: name || phone,
        phone,
        lastMessageDate: new Date(),
        lastCampaignName: campaignName,
        userId,
      },
    });
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
