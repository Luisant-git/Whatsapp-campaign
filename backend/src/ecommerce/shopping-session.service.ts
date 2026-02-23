import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

interface ShoppingSession {
  phone: string;
  currentProductId?: number;
  paymentMethod?: string;
  step: 'browsing' | 'buying' | 'details' | 'awaiting_name' | 'awaiting_address' | 'awaiting_city' | 'awaiting_pincode';
  customerName?: string;
  customerAddress?: string;
  customerCity?: string;
  customerPincode?: string;
  timestamp: number;
}

@Injectable()
export class ShoppingSessionService {
  private memoryCache = new Map<string, ShoppingSession>();
  private processingLock = new Map<string, Promise<any>>();
  
  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService
  ) {}

  private async getTenantClient(tenantId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
    return this.tenantPrisma.getTenantClient(tenantId.toString(), dbUrl);
  }

  async setSession(phone: string, data: Partial<ShoppingSession>, tenantId?: number) {
    if (!tenantId) return;
    
    const cacheKey = `${tenantId}:${phone}`;
    
    // Create lock promise
    const lockPromise = (async () => {
      const existing = this.memoryCache.get(cacheKey);
      const sessionData: ShoppingSession = { 
        phone,
        step: 'browsing',
        timestamp: Date.now(),
        ...existing, 
        ...data
      };
      
      // Update memory cache immediately
      this.memoryCache.set(cacheKey, sessionData);
      
      // Update database in background (fire and forget)
      this.getTenantClient(tenantId).then(client => {
        client.shoppingSession.upsert({
          where: { phone },
          update: {
            currentProductId: sessionData.currentProductId,
            paymentMethod: sessionData.paymentMethod,
            step: sessionData.step,
            customerName: sessionData.customerName,
            customerAddress: sessionData.customerAddress,
            customerCity: sessionData.customerCity,
            customerPincode: sessionData.customerPincode,
            updatedAt: new Date(),
          },
          create: {
            phone,
            currentProductId: sessionData.currentProductId,
            paymentMethod: sessionData.paymentMethod,
            step: sessionData.step,
            customerName: sessionData.customerName,
            customerAddress: sessionData.customerAddress,
            customerCity: sessionData.customerCity,
            customerPincode: sessionData.customerPincode,
          },
        }).catch(e => console.error('DB save error:', e));
      }).catch(e => console.error('Tenant client error:', e));
    })();
    
    // Set lock
    this.processingLock.set(cacheKey, lockPromise);
    
    // Wait for completion and remove lock
    await lockPromise;
    this.processingLock.delete(cacheKey);
  }

  async getSession(phone: string, tenantId?: number): Promise<ShoppingSession | undefined> {
    if (!tenantId) return undefined;
    
    const cacheKey = `${tenantId}:${phone}`;
    
    // Wait if already processing
    if (this.processingLock.has(cacheKey)) {
      await this.processingLock.get(cacheKey);
    }
    
    // Check memory cache first
    const cached = this.memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
      return cached;
    }
    
    // If not in cache, try loading from database with timeout
    try {
      const client = await this.getTenantClient(tenantId);
      const dbPromise = client.shoppingSession.findUnique({ where: { phone } });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('DB timeout')), 2000)
      );
      
      const session = await Promise.race([dbPromise, timeoutPromise]);
      
      if (session) {
        const timestamp = session.updatedAt.getTime();
        if (Date.now() - timestamp < 30 * 60 * 1000) {
          const sessionData: ShoppingSession = {
            phone: session.phone,
            currentProductId: session.currentProductId ?? undefined,
            paymentMethod: session.paymentMethod ?? undefined,
            step: (session.step || 'browsing') as ShoppingSession['step'],
            customerName: session.customerName ?? undefined,
            customerAddress: session.customerAddress ?? undefined,
            customerCity: session.customerCity ?? undefined,
            customerPincode: session.customerPincode ?? undefined,
            timestamp,
          };
          
          this.memoryCache.set(cacheKey, sessionData);
          return sessionData;
        }
      }
    } catch (e) {
      console.error('DB load error:', e?.message || e);
    }
    
    this.memoryCache.delete(cacheKey);
    return undefined;
  }

  async clearSession(phone: string, tenantId?: number) {
    if (!tenantId) return;
    
    const cacheKey = `${tenantId}:${phone}`;
    this.memoryCache.delete(cacheKey);
    
    try {
      const client = await this.getTenantClient(tenantId);
      await client.shoppingSession.delete({ where: { phone } });
    } catch (e) {
      console.error('Clear session error:', e?.message || e);
    }
  }

  async setProductForPurchase(phone: string, productId: number, tenantId?: number) {
    await this.setSession(phone, { currentProductId: productId, step: 'buying' }, tenantId);
  }

  async getProductForPurchase(phone: string, tenantId?: number): Promise<number | undefined> {
    const session = await this.getSession(phone, tenantId);
    return session?.currentProductId;
  }

  async setPaymentMethod(phone: string, method: string, tenantId?: number) {
    await this.setSession(phone, { paymentMethod: method }, tenantId);
  }

  async getPaymentMethod(phone: string, tenantId?: number): Promise<string | undefined> {
    const session = await this.getSession(phone, tenantId);
    return session?.paymentMethod;
  }

  async setCustomerName(phone: string, name: string, tenantId?: number) {
    await this.setSession(phone, { customerName: name, step: 'awaiting_address' }, tenantId);
  }

  async getCustomerName(phone: string, tenantId?: number): Promise<string | undefined> {
    const session = await this.getSession(phone, tenantId);
    return session?.customerName;
  }

  async setCustomerAddress(phone: string, address: string, tenantId?: number) {
    await this.setSession(phone, { customerAddress: address, step: 'awaiting_city' }, tenantId);
  }

  async getCustomerAddress(phone: string, tenantId?: number): Promise<string | undefined> {
    const session = await this.getSession(phone, tenantId);
    return session?.customerAddress;
  }

  async setCustomerCity(phone: string, city: string, tenantId?: number) {
    await this.setSession(phone, { customerCity: city, step: 'awaiting_pincode' }, tenantId);
  }

  async getCustomerCity(phone: string, tenantId?: number): Promise<string | undefined> {
    const session = await this.getSession(phone, tenantId);
    return session?.customerCity;
  }

  async setCustomerPincode(phone: string, pincode: string, tenantId?: number) {
    await this.setSession(phone, { customerPincode: pincode }, tenantId);
  }

  async getCustomerPincode(phone: string, tenantId?: number): Promise<string | undefined> {
    const session = await this.getSession(phone, tenantId);
    return session?.customerPincode;
  }

  async getStep(phone: string, tenantId?: number): Promise<string | undefined> {
    const session = await this.getSession(phone, tenantId);
    return session?.step;
  }
}
