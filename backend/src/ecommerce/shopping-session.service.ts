import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
  constructor(private prisma: PrismaService) {}

  async setSession(phone: string, data: Partial<ShoppingSession>) {
    const existing = await this.getSession(phone);
    const sessionData = { ...existing, ...data, timestamp: Date.now() };
    
    await this.prisma.shoppingSession.upsert({
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

  async getSession(phone: string): Promise<ShoppingSession | undefined> {
    const session = await this.prisma.shoppingSession.findUnique({
      where: { phone },
    });
    
    if (!session) return undefined;
    
    // Clear old sessions (30 minutes)
    const timestamp = session.updatedAt.getTime();
    if (Date.now() - timestamp > 30 * 60 * 1000) {
      await this.clearSession(phone);
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

  async clearSession(phone: string) {
    await this.prisma.shoppingSession.delete({
      where: { phone },
    }).catch(() => {});
  }

  async setProductForPurchase(phone: string, productId: number) {
    await this.setSession(phone, { currentProductId: productId, step: 'buying' });
  }

  async getProductForPurchase(phone: string): Promise<number | undefined> {
    const session = await this.getSession(phone);
    return session?.currentProductId;
  }

  async setPaymentMethod(phone: string, method: string) {
    await this.setSession(phone, { paymentMethod: method });
  }

  async getPaymentMethod(phone: string): Promise<string | undefined> {
    const session = await this.getSession(phone);
    return session?.paymentMethod;
  }

  async setCustomerName(phone: string, name: string) {
    await this.setSession(phone, { customerName: name, step: 'awaiting_address' });
  }

  async getCustomerName(phone: string): Promise<string | undefined> {
    const session = await this.getSession(phone);
    return session?.customerName;
  }

  async setCustomerAddress(phone: string, address: string) {
    await this.setSession(phone, { customerAddress: address, step: 'awaiting_city' });
  }

  async getCustomerAddress(phone: string): Promise<string | undefined> {
    const session = await this.getSession(phone);
    return session?.customerAddress;
  }

  async setCustomerCity(phone: string, city: string) {
    await this.setSession(phone, { customerCity: city, step: 'awaiting_pincode' });
  }

  async getCustomerCity(phone: string): Promise<string | undefined> {
    const session = await this.getSession(phone);
    return session?.customerCity;
  }

  async setCustomerPincode(phone: string, pincode: string) {
    await this.setSession(phone, { customerPincode: pincode });
  }

  async getCustomerPincode(phone: string): Promise<string | undefined> {
    const session = await this.getSession(phone);
    return session?.customerPincode;
  }

  async getStep(phone: string): Promise<string | undefined> {
    const session = await this.getSession(phone);
    return session?.step;
  }
}
