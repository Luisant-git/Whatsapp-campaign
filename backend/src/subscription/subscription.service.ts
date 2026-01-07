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

  async subscribe(userId: number, planId: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    // Create subscription order with pending status
    await this.prisma.subscriptionOrder.create({
      data: {
        userId,
        planId,
        amount: plan.price,
        startDate,
        endDate,
        status: 'pending'
      }
    });

    return { message: 'Subscription request submitted. Waiting for admin approval.' };
  }

  async getCurrentPlan(userId: number) {
    // Get the most recent active order based on creation date
    const latestOrder = await this.prisma.subscriptionOrder.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: { plan: true }
    });

    if (!latestOrder) {
      return { subscription: null, isActive: false };
    }

    // Auto-set as current plan if not already
    if (!latestOrder.isCurrentPlan) {
      // Unset all other current plans
      await this.prisma.subscriptionOrder.updateMany({
        where: { userId, isCurrentPlan: true },
        data: { isCurrentPlan: false }
      });
      
      // Set latest as current
      await this.prisma.subscriptionOrder.update({
        where: { id: latestOrder.id },
        data: { isCurrentPlan: true }
      });

      // Update user subscription
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionId: latestOrder.planId,
          subscriptionStartDate: latestOrder.startDate,
          subscriptionEndDate: latestOrder.endDate
        }
      });
    }

    const isActive = new Date(latestOrder.endDate) > new Date();
    return {
      subscription: latestOrder.plan,
      startDate: latestOrder.startDate,
      endDate: latestOrder.endDate,
      isActive
    };
  }

  async getUserOrders(userId: number) {
    return this.prisma.subscriptionOrder.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllUserSubscriptions() {
    const users = await this.prisma.user.findMany({
      where: { subscriptionId: { not: null } },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        subscription: true
      },
      orderBy: { subscriptionEndDate: 'desc' }
    });

    return users.map(user => ({
      ...user,
      isActive: user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date()
    }));
  }

  async getAllOrders() {
    return this.prisma.subscriptionOrder.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        plan: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateOrderStatus(orderId: number, status: string) {
    const order = await this.prisma.subscriptionOrder.findUnique({
      where: { id: orderId },
      include: { user: true, plan: true }
    });

    if (!order) throw new Error('Order not found');

    await this.prisma.subscriptionOrder.update({
      where: { id: orderId },
      data: { status }
    });

    // If approved, automatically set as current plan if it's the most recent
    if (status === 'active') {
      const latestOrder = await this.prisma.subscriptionOrder.findFirst({
        where: { userId: order.userId, status: 'active' },
        orderBy: { createdAt: 'desc' }
      });

      // If this is the most recent order, set it as current
      if (latestOrder && latestOrder.id === orderId) {
        // Unset other current plans
        await this.prisma.subscriptionOrder.updateMany({
          where: { userId: order.userId, isCurrentPlan: true },
          data: { isCurrentPlan: false }
        });

        // Set this as current plan
        await this.prisma.subscriptionOrder.update({
          where: { id: orderId },
          data: { isCurrentPlan: true }
        });

        // Update user subscription
        await this.prisma.user.update({
          where: { id: order.userId },
          data: {
            subscriptionId: order.planId,
            subscriptionStartDate: order.startDate,
            subscriptionEndDate: order.endDate
          }
        });
      }
    }

    return { message: 'Order status updated', order };
  }

  async setCurrentPlan(userId: number, orderId: number) {
    // First, get the order to verify it belongs to user and is active
    const order = await this.prisma.subscriptionOrder.findFirst({
      where: { id: orderId, userId, status: 'active' },
      include: { plan: true }
    });

    if (!order) {
      throw new Error('Order not found or not active');
    }

    // Unset all current plans for user in a transaction
    await this.prisma.$transaction([
      this.prisma.subscriptionOrder.updateMany({
        where: { userId },
        data: { isCurrentPlan: false }
      }),
      this.prisma.subscriptionOrder.update({
        where: { id: orderId },
        data: { isCurrentPlan: true }
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionId: order.planId,
          subscriptionStartDate: order.startDate,
          subscriptionEndDate: order.endDate
        }
      })
    ]);

    return { message: 'Current plan updated', order };
  }
}
