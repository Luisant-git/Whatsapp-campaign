import { Injectable } from '@nestjs/common';
import { EcommerceService } from './ecommerce.service';
import { ShoppingSessionService } from './shopping-session.service';
import { MetaCatalogService } from './meta-catalog.service';
import { CentralPrismaService } from '../central-prisma.service';
import axios from 'axios';

@Injectable()
export class WhatsappEcommerceService {
  constructor(
    private ecommerceService: EcommerceService,
    private sessionService: ShoppingSessionService,
    public metaCatalogService: MetaCatalogService,
    private prisma: CentralPrismaService,
  ) {}

  private async checkMetaCatalogPermission(userId: number): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });
    
    if (!tenant?.subscription) return false;
    
    const menuPermissions = tenant.subscription.menuPermissions || [];
    return menuPermissions.includes('ecommerce.meta-catalog');
  }

  async handleIncomingMessage(phone: string, message: string, accessToken: string, phoneNumberId: string, userId: number) {
    const msg = message.toLowerCase().trim();

    if (msg === 'shop' || msg === 'catalog' || msg === 'products') {
      try {
        console.log(`[Ecommerce] Handling '${msg}' keyword for ${phone}`);
        
        const hasMetaCatalog = await this.checkMetaCatalogPermission(userId);
        
        if (hasMetaCatalog) {
          await this.metaCatalogService.sendCatalogMessage(phone, phoneNumberId, userId);
        } else {
          await this.sendCategoryList(phone, accessToken, phoneNumberId, userId);
        }
        return true;
      } catch (error) {
        console.error('[Ecommerce] Error sending catalog:', error);
        throw error;
      }
    }

    if (msg.startsWith('cat:')) {
      const categoryId = parseInt(msg.split(':')[1]);
      return this.sendSubCategoryList(phone, categoryId, accessToken, phoneNumberId, userId);
    }

    if (msg.startsWith('sub:')) {
      const subCategoryId = parseInt(msg.split(':')[1]);
      return this.sendProductList(phone, subCategoryId, accessToken, phoneNumberId, userId);
    }

    if (msg.startsWith('prod:')) {
      const productId = parseInt(msg.split(':')[1]);
      return this.sendProductDetails(phone, productId, accessToken, phoneNumberId, userId);
    }

    if (msg.startsWith('buy:')) {
      const productId = parseInt(msg.split(':')[1]);
      return this.handleBuyNow(phone, productId, accessToken, phoneNumberId, userId);
    }

    if (msg === 'cod') {
      return this.handleCODPayment(phone, accessToken, phoneNumberId, userId);
    }

    return null;
  }

  async sendCategoryList(phone: string, accessToken: string, phoneNumberId: string, userId: number) {
    const categories = await this.ecommerceService.getCategories(userId);

    const buttons = categories.slice(0, 3).map((cat) => ({
      type: 'reply',
      reply: { id: `cat:${cat.id}`, title: cat.name.substring(0, 20) },
    }));

    return this.sendWhatsAppMessage(phone, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: '🛍️ Select a Category:' },
        action: { buttons },
      },
    }, accessToken, phoneNumberId);
  }

  async sendSubCategoryList(phone: string, categoryId: number, accessToken: string, phoneNumberId: string, userId: number) {
    const subCategories = await this.ecommerceService.getSubCategories(categoryId, userId);

    const rows = subCategories.map((sub) => ({
      id: `sub:${sub.id}`,
      title: sub.name.substring(0, 24),
    }));

    return this.sendWhatsAppMessage(phone, {
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: 'Choose a subcategory:' },
        action: {
          button: 'View Options',
          sections: [{ title: 'Subcategories', rows }],
        },
      },
    }, accessToken, phoneNumberId);
  }

  async sendProductList(phone: string, subCategoryId: number, accessToken: string, phoneNumberId: string, userId: number) {
    const hasMetaCatalog = await this.checkMetaCatalogPermission(userId);
    const products = await this.ecommerceService.getProducts(subCategoryId, userId, !hasMetaCatalog);

    const rows = products.map((prod) => ({
      id: `prod:${prod.id}`,
      title: prod.name.substring(0, 24),
      description: `₹${prod.price}`,
    }));

    return this.sendWhatsAppMessage(phone, {
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: 'Select a product:' },
        action: {
          button: 'View Products',
          sections: [{ title: 'Products', rows }],
        },
      },
    }, accessToken, phoneNumberId);
  }

  async sendProductDetails(phone: string, productId: number, accessToken: string, phoneNumberId: string, userId: number) {
    const product = await this.ecommerceService.getProduct(productId, userId);
    if (!product) return;

    await this.sessionService.setProductForPurchase(phone, productId, userId);

    const message = `*${product.name}*\n\n${product.description}\n\n💰 Price: ₹${product.price}`;

    return this.sendWhatsAppMessage(phone, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: message },
        action: {
          buttons: [{
            type: 'reply',
            reply: { id: `buy:${productId}`, title: '🛒 Buy Now' }
          }]
        }
      }
    }, accessToken, phoneNumberId);
  }

  async handleBuyNow(phone: string, productId: number, accessToken: string, phoneNumberId: string, userId: number) {
    const product = await this.ecommerceService.getProduct(productId, userId);
    if (!product) return;

    await this.sessionService.setProductForPurchase(phone, productId, userId);

    return this.sendWhatsAppMessage(phone, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: `💳 Select Payment Method\n\n*${product.name}*\nTotal: ₹${product.price}` },
        action: {
          buttons: [{
            type: 'reply',
            reply: { id: 'cod', title: '💵 Cash on Delivery' }
          }]
        }
      }
    }, accessToken, phoneNumberId);
  }

  async handleCODPayment(phone: string, accessToken: string, phoneNumberId: string, userId: number) {
    const cart = await this.sessionService.getCartProducts(phone, userId) || [];
    const productId = cart.length > 0 ? cart[0].productId : null;
    if (!productId) {
      return this.sendWhatsAppMessage(phone, {
        type: 'text',
        text: { body: 'Please select a product first. Send "shop" to browse products.' },
      }, accessToken, phoneNumberId);
    }

    const product = await this.ecommerceService.getProduct(productId, userId);
    if (!product) return;

    await this.sessionService.setPaymentMethod(phone, 'COD', userId);
    await this.sessionService.setSession(phone, { step: 'awaiting_name' }, userId);

    return this.sendWhatsAppMessage(phone, {
      type: 'text',
      text: {
        body: `📦 *Order Details*\n\nProduct: ${product.name}\nPrice: ₹${product.price}\nPayment: Cash on Delivery\n\nPlease provide your full name:`,
      },
    }, accessToken, phoneNumberId);
  }

  async createOrderFromMessage(phone: string, message: string, userId: number) {
    const step = await this.sessionService.getStep(phone, userId);
    const trimmedMsg = message.trim();
    
    if (step === 'awaiting_name') {
      const existingName = await this.sessionService.getCustomerName(phone, userId);
      if (existingName === trimmedMsg) return false;
      await this.sessionService.setCustomerName(phone, trimmedMsg, userId);
      return 'awaiting_address';
    }
    
    if (step === 'awaiting_address') {
      const existingAddress = await this.sessionService.getCustomerAddress(phone, userId);
      if (existingAddress === trimmedMsg) return false;
      await this.sessionService.setCustomerAddress(phone, trimmedMsg, userId);
      return 'awaiting_city';
    }
    
    if (step === 'awaiting_city') {
      const existingCity = await this.sessionService.getCustomerCity(phone, userId);
      if (existingCity === trimmedMsg) return false;
      await this.sessionService.setCustomerCity(phone, trimmedMsg, userId);
      return 'awaiting_pincode';
    }
    
    if (step === 'awaiting_pincode') {
      const existingPincode = await this.sessionService.getCustomerPincode(phone, userId);
      if (existingPincode === trimmedMsg) return false;
      await this.sessionService.setCustomerPincode(phone, trimmedMsg, userId);
      
      const cart = await this.sessionService.getCartProducts(phone, userId) || [];
      const customerName = await this.sessionService.getCustomerName(phone, userId);
      const customerAddress = await this.sessionService.getCustomerAddress(phone, userId);
      const customerCity = await this.sessionService.getCustomerCity(phone, userId);
      
      if (cart.length === 0 || !customerName || !customerAddress || !customerCity) return false;
      
      const fullAddress = `${customerAddress}, ${customerCity}, ${trimmedMsg}`;
      
      // Create single order with all products
      let totalAmount = 0;
      for (const item of cart) {
        const product = await this.ecommerceService.getProduct(item.productId, userId);
        if (product) totalAmount += product.price * item.quantity;
      }
      
      const order = await this.ecommerceService.createOrder({
        customerName,
        customerPhone: phone,
        customerAddress: fullAddress,
        productId: cart[0].productId,
        quantity: cart.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount,
      }, userId);
      
      await this.sessionService.clearSession(phone, userId);
      return true;
    }
    
    return false;
  }

  private async sendWhatsAppMessage(phone: string, message: any, accessToken: string, phoneNumberId: string) {
    const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
    return axios.post(url, {
      messaging_product: 'whatsapp',
      to: phone,
      ...message,
    }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
