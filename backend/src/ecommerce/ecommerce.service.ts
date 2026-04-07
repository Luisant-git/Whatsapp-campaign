import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { OwnerNotificationService } from '../notifications/owner-notification.service';

@Injectable()
export class EcommerceService {
  constructor(
    private prisma: PrismaService,
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
    private ownerNotification: OwnerNotificationService,
  ) {}

  private async getTenantClient(userId: number) {
    try {
      const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: userId } });
      if (!tenant) {
        console.error(`Tenant not found for userId: ${userId}`);
        throw new Error('Tenant not found');
      }
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
      return this.tenantPrisma.getTenantClient(userId.toString(), dbUrl);
    } catch (error) {
      console.error('Error in getTenantClient:', error);
      throw error;
    }
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
  async createProduct(data: any, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    const product = await client.product.create({ 
      data,
      include: {
        subCategory: { include: { category: true } },
        variants: true,
      },
    });
  
    // Auto-generate contentId if not provided
    if (!product.contentId) {
      return client.product.update({
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

  async updateProduct(id: number, data: any, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
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
    if (data.metaProductId !== undefined) cleanedData.metaProductId = data.metaProductId;
    if (data.source !== undefined) cleanedData.source = data.source;
  
    // Number fields
    if (data.price !== undefined) cleanedData.price = parseFloat(data.price);
    if (data.salePrice !== undefined) cleanedData.salePrice = data.salePrice ? parseFloat(data.salePrice) : null;
    if (data.subCategoryId !== undefined) cleanedData.subCategoryId = parseInt(data.subCategoryId);
    if (data.stock !== undefined) cleanedData.stock = parseInt(data.stock);
    // Boolean fields - THIS IS THE FIX
    if (data.availability !== undefined) cleanedData.availability = parseBoolean(data.availability);
    if (data.isActive !== undefined) cleanedData.isActive = parseBoolean(data.isActive);
  
    return client.product.update({
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
      where: { 
        customerPhone: phone,
        status: { not: 'draft' } // Exclude draft orders
      },
      orderBy: { createdAt: 'desc' },
    });
    return order;
  }

  async getDraftOrderByPhone(phone: string, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    const draftOrder = await client.order.findFirst({
      where: { 
        customerPhone: phone,
        status: 'draft'
      },
      orderBy: { createdAt: 'desc' },
    });
    return draftOrder;
  }


  // varient

 // ecommerce.service.ts - ADD/REPLACE these variant functions

async createVariant(data: any, userId?: number) {
  try {
    console.log('[Service] createVariant called with:', { data, userId });
    
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    
    console.log('[Service] Got client, creating variant...');
    
    // Generate contentId before creation if not provided
    // Make it more unique to avoid conflicts
    let contentId = data.contentId;
    
    if (!contentId || contentId.trim() === '') {
      contentId = `variant_${data.productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Check if contentId already exists and make it unique if needed
    const existingVariant = await client.productVariant.findUnique({
      where: { contentId: contentId }
    });
    
    if (existingVariant) {
      console.log('[Service] ContentId already exists, generating new one');
      contentId = `variant_${data.productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    const variant = await client.productVariant.create({
      data: {
        productId: data.productId,
        name: data.name,
        description: data.description,
        price: data.price,
        salePrice: data.salePrice,
        stock: data.stock ?? 0,   
        imageUrl: data.imageUrl,
        link: data.link,
        contentId: contentId,
        availability: data.availability ?? true,
        isActive: data.isActive ?? true,
        // ✅ Add variant attributes
        size: data.size || null,
        color: data.color || null,
        pattern: data.pattern || null,
        gender: data.gender || null,
        material: data.material || null,
        ageGroup: data.ageGroup || null,
        customAttribute: data.customAttribute || null,
      },
    });

    console.log('[Service] Variant created successfully:', variant.id);
    return variant;
  } catch (error) {
    console.error('[Service] Error in createVariant:', error.message, error.stack);
    throw error;
  }
}

async getVariants(productId: number, userId?: number) {
  const client = userId ? await this.getTenantClient(userId) : this.prisma;
  return client.productVariant.findMany({
    where: { productId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
}

async getVariant(id: number, userId?: number) {
  const client = userId ? await this.getTenantClient(userId) : this.prisma;
  return client.productVariant.findUnique({
    where: { id },
  });
}

async updateVariant(id: number, data: any, userId?: number) {
  const client = userId ? await this.getTenantClient(userId) : this.prisma;
  
  try {
    const parseBoolean = (value: any): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      if (typeof value === 'number') return value === 1;
      return Boolean(value);
    };

    const cleanedData: any = {};
    if (data.name !== undefined) cleanedData.name = data.name;
    if (data.description !== undefined) cleanedData.description = data.description;
    if (data.price !== undefined) cleanedData.price = parseFloat(data.price);
    if (data.salePrice !== undefined) cleanedData.salePrice = data.salePrice ? parseFloat(data.salePrice) : null;
    if (data.stock !== undefined) cleanedData.stock = parseInt(data.stock);
    if (data.imageUrl !== undefined) cleanedData.imageUrl = data.imageUrl;
    if (data.link !== undefined) cleanedData.link = data.link;
    if (data.contentId !== undefined) cleanedData.contentId = data.contentId;
    if (data.metaProductId !== undefined) cleanedData.metaProductId = data.metaProductId;
    if (data.source !== undefined) cleanedData.source = data.source;
    if (data.availability !== undefined) cleanedData.availability = parseBoolean(data.availability);
    if (data.isActive !== undefined) cleanedData.isActive = parseBoolean(data.isActive);
    
    // ✅ Add variant attributes
    if (data.size !== undefined) cleanedData.size = data.size || null;
    if (data.color !== undefined) cleanedData.color = data.color || null;
    if (data.pattern !== undefined) cleanedData.pattern = data.pattern || null;
    if (data.gender !== undefined) cleanedData.gender = data.gender || null;
    if (data.material !== undefined) cleanedData.material = data.material || null;
    if (data.ageGroup !== undefined) cleanedData.ageGroup = data.ageGroup || null;
    if (data.customAttribute !== undefined) cleanedData.customAttribute = data.customAttribute || null;

    return client.productVariant.update({
      where: { id },
      data: cleanedData,
    });
  } catch (error) {
    console.error('Error in updateVariant service:', error);
    throw error;
  }
}

async deleteVariant(id: number, userId?: number) {
  const client = userId ? await this.getTenantClient(userId) : this.prisma;
  return client.productVariant.update({
    where: { id },
    data: { isActive: false },
  });
}
  // Orders
  async createOrder(data: any, userId?: number) {
    const client = userId ? await this.getTenantClient(userId) : this.prisma;
    const { items, customerState, ...orderData } = data;
  
    let shippingAmount = 0;
  
    if (customerState) {
      const shippingRate = await client.shippingRate.findUnique({
        where: { state: customerState.toUpperCase() },
      });
      shippingAmount = shippingRate?.flatShippingRate || 0;
    }
  
    const itemsTotal = (items || []).reduce(
      (sum, item) => sum + (item.price * (item.quantity || 1)),
      0
    );
  
    const totalAmount = itemsTotal + shippingAmount;
  
    const order = await client.order.create({
      data: {
        ...orderData,
        customerState,
        totalAmount,
        shippingAmount,
        items: {
          create: items || [],
        },
      },
      include: { items: { include: { product: true } } },
    });
    
    console.log('📝 Order created:', JSON.stringify({ id: order.id, customerName: order.customerName, totalAmount: order.totalAmount, status: order.status }, null, 2));
    
    // Send notification ONLY if order status is NOT draft
    if (userId && order.status !== 'draft') {
      try {
        console.log('🔔 Order is confirmed (not draft), sending owner notification...');
        const user = await this.centralPrisma.tenant.findUnique({ where: { id: userId } });
        console.log('👤 User data:', JSON.stringify({ id: user?.id, phoneNumber: user?.phoneNumber }, null, 2));
        
        const settings = await client.whatsAppSettings.findFirst();
        console.log('⚙️ Settings found:', settings ? 'Yes' : 'No');
        
        if (user?.phoneNumber && settings) {
          console.log(`📞 Sending order notification to owner: ${user.phoneNumber}`);
          await this.ownerNotification.notifyOrderPlaced(
            order,
            user.phoneNumber,
            settings.accessToken,
            settings.phoneNumberId
          );
          console.log('✅ Owner notification sent successfully');
        } else {
          console.log('⚠️ Cannot send notification - Missing:', {
            hasPhoneNumber: !!user?.phoneNumber,
            hasSettings: !!settings
          });
        }
      } catch (error) {
        console.error('❌ Failed to send owner notification:', error.message);
      }
    } else if (order.status === 'draft') {
      console.log('⚠️ Order is draft - notification will be sent when order is confirmed');
    } else {
      console.log('⚠️ No userId provided for order notification');
    }
    
    return order;
  }

  //stock
  async decreaseStock(productId: number, quantity: number = 1, variantId?: number) {
    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
      if (variant && variant.stock !== null) {
        const newStock = Math.max(0, variant.stock - quantity);
        await this.prisma.productVariant.update({
          where: { id: variantId },
          data: { stock: newStock, availability: newStock > 0 },
        });
      }
    } else {
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      if (product && product.stock !== null) {
        const newStock = Math.max(0, product.stock - quantity);
        await this.prisma.product.update({
          where: { id: productId },
          data: { stock: newStock, availability: newStock > 0 },
        });
      }
    }
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
    
    // Extract items if provided
    const { items, ...orderData } = data;
    
    // If items are provided, delete old items and create new ones
    if (items && Array.isArray(items)) {
      // Delete existing order items
      await client.order.update({
        where: { id },
        data: {
          items: {
            deleteMany: {}
          }
        }
      });
      
      // Update order with new items
      return client.order.update({
        where: { id },
        data: {
          ...orderData,
          items: {
            create: items
          }
        },
        include: { items: { include: { product: true } } }
      });
    }
    
    // If no items, just update order data
    return client.order.update({
      where: { id },
      data: orderData,
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
          const order = await client.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
          if (order) {
            const updatedOrder = await client.order.update({ where: { id }, data: { status } });
            
            // Send notification when order status changes from draft to confirmed
            if (order.status === 'draft' && status !== 'draft') {
              console.log('🔔 Order confirmed! Sending owner notification...');
              const user = await this.centralPrisma.tenant.findUnique({ where: { id: tenant.id } });
              const settings = await client.whatsAppSettings.findFirst();
              
              if (user?.phoneNumber && settings) {
                const fullOrder = await client.order.findUnique({ 
                  where: { id }, 
                  include: { items: { include: { product: true } } } 
                });
                await this.ownerNotification.notifyOrderPlaced(
                  fullOrder,
                  user.phoneNumber,
                  settings.accessToken,
                  settings.phoneNumberId
                );
                console.log('✅ Owner notification sent for confirmed order');
              }
            }
            
            return updatedOrder;
          }
        } catch (error) {
          continue;
        }
      }
      throw new Error('Order not found');
    }
    const client = await this.getTenantClient(userId);
    const order = await client.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
    const updatedOrder = await client.order.update({ where: { id }, data: { status } });
    
    // Send notification when order status changes from draft to confirmed
    if (order && order.status === 'draft' && status !== 'draft') {
      console.log('🔔 Order confirmed! Sending owner notification...');
      const user = await this.centralPrisma.tenant.findUnique({ where: { id: userId } });
      const settings = await client.whatsAppSettings.findFirst();
      
      if (user?.phoneNumber && settings) {
        const fullOrder = await client.order.findUnique({ 
          where: { id }, 
          include: { items: { include: { product: true } } } 
        });
        await this.ownerNotification.notifyOrderPlaced(
          fullOrder,
          user.phoneNumber,
          settings.accessToken,
          settings.phoneNumberId
        );
        console.log('✅ Owner notification sent for confirmed order');
      }
    }
    
    return updatedOrder;
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

  //shipping master crud
  // Shipping Rates
async createShippingRate(state: string, flatShippingRate: number) {
  return this.prisma.shippingRate.create({
    data: {
      state: state.toUpperCase(),
      flatShippingRate,
    },
  });
}

async getShippingRates() {
  return this.prisma.shippingRate.findMany({
    orderBy: { state: 'asc' },
  });
}

async getShippingRateByState(state: string, userId?: number) {
  const client = userId ? await this.getTenantClient(userId) : this.prisma;
  return client.shippingRate.findUnique({
    where: { state: state.toUpperCase() },
  });
}

async updateShippingRate(id: number, data: { state?: string; flatShippingRate?: number }) {
  const updateData: any = {};

  if (data.state !== undefined) {
    updateData.state = data.state.toUpperCase();
  }

  if (data.flatShippingRate !== undefined) {
    updateData.flatShippingRate = data.flatShippingRate;
  }

  return this.prisma.shippingRate.update({
    where: { id },
    data: updateData,
  });
}

async deleteShippingRate(id: number) {
  return this.prisma.shippingRate.delete({
    where: { id },
  });
}
}
