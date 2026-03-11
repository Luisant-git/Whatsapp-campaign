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
    const product = await this.prisma.product.create({ 
      data,
      include: {
        subCategory: { include: { category: true } },
        variants: true,
      },
    });
  
    // Auto-generate contentId if not provided
    if (!product.contentId) {
      return this.prisma.product.update({
        where: { id: product.id },
        data: { contentId: `product_${product.id}` },
        include: {
          subCategory: { include: { category: true } },
          variants: true,
        },
      });
    }
  
    return product;
  }

  async getProducts(subCategoryId?: number, userId?: number, excludeMetaProducts?: boolean) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    
    // Check Meta Catalog permission
    let hasMetaCatalogPermission = true;
    if (userId) {
      try {
        const tenant = await this.centralPrisma.tenant.findUnique({
          where: { id: userId },
          include: { subscription: true }
        });
        
        if (tenant?.subscription?.menuPermissions) {
          hasMetaCatalogPermission = tenant.subscription.menuPermissions.includes('ecommerce.products.metacatalog');
        }
      } catch (error) {
        console.error('Error checking Meta Catalog permission:', error);
      }
    }
    
    const whereClause: any = { 
      isActive: true, 
      ...(subCategoryId && { subCategoryId })
    };
    
    // If Meta Catalog permission is disabled, exclude products with metaProductId
    if (!hasMetaCatalogPermission) {
      whereClause.metaProductId = null;
    }
    
    return client.product.findMany({
      where: whereClause,
      include: { 
        subCategory: { include: { category: true } },
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProduct(id: number, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    return client.product.findUnique({
      where: { id },
      include: { 
        subCategory: { include: { category: true } },
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async updateProduct(id: number, data: any) {
    // Parse booleans - FormData sends "false" as string which is truthy
    const parseBoolean = (value: any): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      if (typeof value === 'number') return value === 1;
      return Boolean(value);
    };
  
    const cleanedData: any = {};
  
    // String fields
    if (data.name !== undefined) cleanedData.name = data.name;
    if (data.description !== undefined) cleanedData.description = data.description || '';
    if (data.link !== undefined) cleanedData.link = data.link || null;
    if (data.contentId !== undefined) cleanedData.contentId = data.contentId || null;
    if (data.imageUrl !== undefined) cleanedData.imageUrl = data.imageUrl;
  
    // Number fields
    if (data.price !== undefined) cleanedData.price = parseFloat(data.price);
    if (data.salePrice !== undefined) cleanedData.salePrice = data.salePrice ? parseFloat(data.salePrice) : null;
    if (data.subCategoryId !== undefined) cleanedData.subCategoryId = parseInt(data.subCategoryId);
  
    // Boolean fields - THIS IS THE FIX
    if (data.availability !== undefined) cleanedData.availability = parseBoolean(data.availability);
    if (data.isActive !== undefined) cleanedData.isActive = parseBoolean(data.isActive);
  
    return this.prisma.product.update({
      where: { id },
      data: cleanedData,
      include: {
        subCategory: { include: { category: true } },
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
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


  // varient

 // ecommerce.service.ts - ADD/REPLACE these variant functions

async createVariant(data: any) {
  const variant = await this.prisma.productVariant.create({
    data: {
      productId: data.productId,
      name: data.name,
      description: data.description,
      price: data.price,
      salePrice: data.salePrice,
      imageUrl: data.imageUrl,
      link: data.link,
      contentId: data.contentId || null,
      availability: data.availability ?? true,
      isActive: data.isActive ?? true,
    },
  });

  // Auto-generate contentId if not provided
  if (!variant.contentId) {
    return this.prisma.productVariant.update({
      where: { id: variant.id },
      data: { contentId: `variant_${variant.id}` },
    });
  }

  return variant;
}

async getVariants(productId: number) {
  return this.prisma.productVariant.findMany({
    where: { productId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
}

async getVariant(id: number) {
  return this.prisma.productVariant.findUnique({
    where: { id },
  });
}

async updateVariant(id: number, data: any) {
  return this.prisma.productVariant.update({
    where: { id },
    data,
  });
}

async deleteVariant(id: number) {
  return this.prisma.productVariant.update({
    where: { id },
    data: { isActive: false },
  });
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
      include: { items: { include: { product: true } } },
    });
  }

  async getOrder(id: number, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    return client.order.findUnique({
      where: { id },
      include: { 
        items: { 
          include: { 
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                description: true
              }
            }
          }
        }
      },
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
          include: { 
            items: { 
              include: { 
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    imageUrl: true,
                    description: true
                  }
                }
              }
            }
          },
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
    });
  }

  async getOrders(userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    return client.order.findMany({
      include: { 
        items: { 
          include: { 
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                description: true
              }
            }
          }
        }
      },
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
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const customerMap = new Map();
    for (const order of orders) {
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
      
      const productNames = order.items?.map(item => item.product?.name).join(', ') || 'Unknown';
      customer.orders.push({
        id: order.id,
        productName: productNames,
        amount: order.totalAmount,
        status: order.status,
        date: order.createdAt
      });
    }

    return Array.from(customerMap.values());
  }
}
