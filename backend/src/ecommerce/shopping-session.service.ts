import { Injectable } from '@nestjs/common';

interface ShoppingSession {
  phone: string;
  currentProductId?: number;
  paymentMethod?: string;
  step: 'browsing' | 'buying' | 'details' | 'awaiting_name' | 'awaiting_address';
  customerName?: string;
  customerAddress?: string;
  timestamp: number;
}

@Injectable()
export class ShoppingSessionService {
  private sessions: Map<string, ShoppingSession> = new Map();

  setSession(phone: string, data: Partial<ShoppingSession>) {
    const existing = this.sessions.get(phone) || { phone, step: 'browsing', timestamp: Date.now() };
    this.sessions.set(phone, { ...existing, ...data, timestamp: Date.now() });
  }

  getSession(phone: string): ShoppingSession | undefined {
    const session = this.sessions.get(phone);
    // Clear old sessions (30 minutes)
    if (session && Date.now() - session.timestamp > 30 * 60 * 1000) {
      this.sessions.delete(phone);
      return undefined;
    }
    return session;
  }

  clearSession(phone: string) {
    this.sessions.delete(phone);
  }

  setProductForPurchase(phone: string, productId: number) {
    this.setSession(phone, { currentProductId: productId, step: 'buying' });
  }

  getProductForPurchase(phone: string): number | undefined {
    return this.getSession(phone)?.currentProductId;
  }

  setPaymentMethod(phone: string, method: string) {
    this.setSession(phone, { paymentMethod: method });
  }

  getPaymentMethod(phone: string): string | undefined {
    return this.getSession(phone)?.paymentMethod;
  }

  setCustomerName(phone: string, name: string) {
    this.setSession(phone, { customerName: name, step: 'awaiting_address' });
  }

  getCustomerName(phone: string): string | undefined {
    return this.getSession(phone)?.customerName;
  }

  setCustomerAddress(phone: string, address: string) {
    this.setSession(phone, { customerAddress: address });
  }

  getCustomerAddress(phone: string): string | undefined {
    return this.getSession(phone)?.customerAddress;
  }

  getStep(phone: string): string | undefined {
    return this.getSession(phone)?.step;
  }
}
