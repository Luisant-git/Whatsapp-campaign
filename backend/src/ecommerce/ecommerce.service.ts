import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class EcommerceService {
  constructor(
    private prisma: PrismaService,
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {}

  private async getTenantClient(userId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: userId } });
    if (!tenant) throw new Error('Tenant not found');
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
    return this.tenantPrisma.getTenantClient(userId.toString(), dbUrl);
  }

  // Categories
  async createCategory(name: string) {
    return this.prisma.category.create({ data: { name } });
  }

  async getCategories(userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    return client.category.findMany({
      include: { subCategories: true },
    });
  }

  async updateCategory(id: number, name: string) {
    return this.prisma.category.update({
      where: { id },
      data: { name },
    });
  }

  async deleteCategory(id: number) {
    return this.prisma.category.delete({ where: { id } });
  }

  // SubCategories
  async createSubCategory(name: string, categoryId: number) {
    return this.prisma.subCategory.create({
      data: { name, categoryId },
    });
  }

  async getSubCategories(categoryId?: number, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    return client.subCategory.findMany({
      where: categoryId ? { categoryId } : {},
      include: { products: true },
    });
  }

  async updateSubCategory(id: number, data: { name?: string; categoryId?: number }) {
    return this.prisma.subCategory.update({
      where: { id },
      data,
    });
  }

  async deleteSubCategory(id: number) {
    return this.prisma.subCategory.delete({ where: { id } });
  }

  // Products
  async createProduct(data: any) {
    return this.prisma.product.create({ data });
  }

  async getProducts(subCategoryId?: number, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    return client.product.findMany({
      where: { isActive: true, ...(subCategoryId && { subCategoryId }) },
      include: { subCategory: { include: { category: true } } },
    });
  }

  async getProduct(id: number, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    return client.product.findUnique({
      where: { id },
      include: { subCategory: { include: { category: true } } },
    });
  }

  async updateProduct(id: number, data: any) {
    return this.prisma.product.update({ where: { id }, data });
  }

  async deleteProduct(id: number) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getCustomerByPhone(phone: string, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    const order = await client.order.findFirst({
      where: { customerPhone: phone },
      orderBy: { createdAt: 'desc' },
    });
    return order;
  }

  // Orders
  async createOrder(data: any, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    const { items, ...orderData } = data;
    
    return client.order.create({
      data: {
        ...orderData,
        items: {
          create: items || []
        }
      },
      include: { product: true },
    });
  }

  async getOrder(id: number, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    return client.order.findUnique({
      where: { id },
      include: { product: true },
    });
  }

  async getOrderById(id: number) {
    // Try to find order across all tenants
    const tenants = await this.centralPrisma.tenant.findMany();
    
    for (const tenant of tenants) {
      try {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
        const client = await this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        const order = await client.order.findUnique({
          where: { id },
          include: { product: true },
        });
        if (order) return order;
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  async updateOrder(id: number, data: any, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    return client.order.update({
      where: { id },
      data,
      include: { product: true },
    });
  }

  async getOrders(userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    return client.order.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrderStatus(id: number, status: string, userId?: number) {
    if (!userId) {
      const tenants = await this.centralPrisma.tenant.findMany();
      for (const tenant of tenants) {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
          const client = await this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
          const order = await client.order.findUnique({ where: { id } });
          if (order) {
            return client.order.update({ where: { id }, data: { status } });
          }
        } catch (error) {
          continue;
        }
      }
      throw new Error('Order not found');
    }
    const client = await this.getTenantClient(userId);
    return client.order.update({ where: { id }, data: { status } });
  }

  async getCustomers(userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    const orders = await client.order.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    const customerMap = new Map();
    orders.forEach(order => {
      const phone = order.customerPhone;
      if (!customerMap.has(phone)) {
        customerMap.set(phone, {
          customerName: order.customerName,
          customerPhone: phone,
          customerAddress: order.customerAddress,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt,
          orders: []
        });
      }
      const customer = customerMap.get(phone);
      customer.totalOrders++;
      customer.totalSpent += order.totalAmount;
      customer.orders.push({
        id: order.id,
        productName: order.product?.name,
        amount: order.totalAmount,
        status: order.status,
        date: order.createdAt
      });
    });

    return Array.from(customerMap.values());
  }
}
