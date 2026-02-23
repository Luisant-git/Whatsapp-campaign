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
    if (!tenantId) return; // Skip if no tenant context
    
    const client = await this.getTenantClient(tenantId);
    const existing = await this.getSession(phone, tenantId);
    const sessionData = { ...existing, ...data, timestamp: Date.now() };
    
    await client.shoppingSession.upsert({
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
        step: sessionData.step || 'browsing',
        customerName: sessionData.customerName,
        customerAddress: sessionData.customerAddress,
        customerCity: sessionData.customerCity,
        customerPincode: sessionData.customerPincode,
      },
    });
  }

  async getSession(phone: string, tenantId?: number): Promise<ShoppingSession | undefined> {
    if (!tenantId) return undefined;
    
    const client = await this.getTenantClient(tenantId);
    const session = await client.shoppingSession.findUnique({
      where: { phone },
    });
    
    if (!session) return undefined;
    
    const timestamp = session.updatedAt.getTime();
    if (Date.now() - timestamp > 30 * 60 * 1000) {
      await this.clearSession(phone, tenantId);
      return undefined;
    }
    
    return {
      phone: session.phone,
      currentProductId: session.currentProductId ?? undefined,
      paymentMethod: session.paymentMethod ?? undefined,
      step: session.step as any,
      customerName: session.customerName ?? undefined,
      customerAddress: session.customerAddress ?? undefined,
      customerCity: session.customerCity ?? undefined,
      customerPincode: session.customerPincode ?? undefined,
      timestamp,
    };
  }

  async clearSession(phone: string, tenantId?: number) {
    if (!tenantId) return;
    
    const client = await this.getTenantClient(tenantId);
    await client.shoppingSession.delete({
      where: { phone },
    }).catch(() => {});
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
