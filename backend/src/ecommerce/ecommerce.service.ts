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

  // Orders
  async createOrder(data: any) {
    return this.prisma.order.create({
      data,
      include: { product: true },
    });
  }

  async getOrders() {
    return this.prisma.order.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrderStatus(id: number, status: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }
}
