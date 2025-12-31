import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, userId: number) {
    return this.prisma.contact.create({
      data: { ...data, userId }
    });
  }

  async findAll(userId: number) {
    return this.prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number, userId: number) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, userId }
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(id: number, data: any, userId: number) {
    await this.findOne(id, userId);
    return this.prisma.contact.update({
      where: { id },
      data
    });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId);
    return this.prisma.contact.delete({
      where: { id }
    });
  }

  async getDeliveryStats(userId: number) {
    const delivered = await this.prisma.contact.count({
      where: { userId, lastDeliveryStatus: 'delivered' }
    });
    const failed = await this.prisma.contact.count({
      where: { userId, lastDeliveryStatus: 'failed' }
    });
    const pending = await this.prisma.contact.count({
      where: { userId, lastDeliveryStatus: 'pending' }
    });
    return { delivered, failed, pending };
  }

  async updateDeliveryStatus(phone: string, status: string, campaignName: string, name: string, userId: number) {
    // First try to update existing contact
    const updated = await this.prisma.contact.updateMany({
      where: { phone, userId },
      data: {
        lastDeliveryStatus: status,
        lastCampaignName: campaignName,
        lastDeliveryTime: new Date()
      }
    });

    // If no contact exists, create one
    if (updated.count === 0) {
      await this.prisma.contact.create({
        data: {
          name: name || phone, // Use provided name or phone as fallback
          phone,
          userId,
          lastDeliveryStatus: status,
          lastCampaignName: campaignName,
          lastDeliveryTime: new Date()
        }
      });
    }

    return updated;
  }
}
