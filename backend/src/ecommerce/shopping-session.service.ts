import { Injectable } from '@nestjs/common';

interface ShoppingSession {
  phone: string;
  currentProductId?: number;
  step: 'browsing' | 'buying' | 'details';
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
}
