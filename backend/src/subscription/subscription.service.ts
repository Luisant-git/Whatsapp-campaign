import { Injectable } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: CentralPrismaService) {}

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
        tenantId: userId,
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
      where: { tenantId: userId, status: 'active' },
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
        where: { tenantId: userId, isCurrentPlan: true },
        data: { isCurrentPlan: false }
      });
      
      // Set latest as current
      await this.prisma.subscriptionOrder.update({
        where: { id: latestOrder.id },
        data: { isCurrentPlan: true }
      });

      // Update tenant subscription
      await this.prisma.tenant.update({
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
      where: { tenantId: userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllUserSubscriptions() {
    const tenants = await this.prisma.tenant.findMany({
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

    return tenants.map(tenant => ({
      ...tenant,
      isActive: tenant.subscriptionEndDate && new Date(tenant.subscriptionEndDate) > new Date()
    }));
  }

  async getAllOrders() {
    return this.prisma.subscriptionOrder.findMany({
      include: {
        tenant: { select: { id: true, email: true, name: true } },
        plan: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateOrderStatus(orderId: number, status: string) {
    const order = await this.prisma.subscriptionOrder.findUnique({
      where: { id: orderId },
      include: { tenant: true, plan: true }
    });

    if (!order) throw new Error('Order not found');

    await this.prisma.subscriptionOrder.update({
      where: { id: orderId },
      data: { status }
    });

    // If approved, automatically set as current plan if it's the most recent
    if (status === 'active') {
      const latestOrder = await this.prisma.subscriptionOrder.findFirst({
        where: { tenantId: order.tenantId, status: 'active' },
        orderBy: { createdAt: 'desc' }
      });

      // If this is the most recent order, set it as current
      if (latestOrder && latestOrder.id === orderId) {
        // Unset other current plans
        await this.prisma.subscriptionOrder.updateMany({
          where: { tenantId: order.tenantId, isCurrentPlan: true },
          data: { isCurrentPlan: false }
        });

        // Set this as current plan
        await this.prisma.subscriptionOrder.update({
          where: { id: orderId },
          data: { isCurrentPlan: true }
        });

        // Update tenant subscription
        await this.prisma.tenant.update({
          where: { id: order.tenantId },
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
      where: { id: orderId, tenantId: userId, status: 'active' },
      include: { plan: true }
    });

    if (!order) {
      throw new Error('Order not found or not active');
    }

    // Unset all current plans for user in a transaction
    await this.prisma.$transaction([
      this.prisma.subscriptionOrder.updateMany({
        where: { tenantId: userId },
        data: { isCurrentPlan: false }
      }),
      this.prisma.subscriptionOrder.update({
        where: { id: orderId },
        data: { isCurrentPlan: true }
      }),
      this.prisma.tenant.update({
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
