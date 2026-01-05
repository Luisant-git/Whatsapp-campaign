import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  private prisma = new PrismaClient();

  async create(data: any) {
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        price: parseFloat(data.price),
        duration: parseInt(data.duration),
        features: data.features || [],
        isActive: data.isActive !== false
      }
    });
    return { message: 'Subscription plan created successfully', plan };
  }

  async findAll() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' }
    });
  }

  async findActive() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
  }

  async findOne(id: number) {
    return this.prisma.subscriptionPlan.findUnique({
      where: { id }
    });
  }

  async update(id: number, data: any) {
    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: data.name,
        price: data.price ? parseFloat(data.price) : undefined,
        duration: data.duration ? parseInt(data.duration) : undefined,
        features: data.features,
        isActive: data.isActive
      }
    });
    return { message: 'Subscription plan updated successfully', plan };
  }

  async remove(id: number) {
    await this.prisma.subscriptionPlan.delete({ where: { id } });
    return { message: 'Subscription plan deleted successfully' };
  }
}
