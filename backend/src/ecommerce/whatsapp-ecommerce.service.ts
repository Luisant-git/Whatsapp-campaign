import { Injectable } from '@nestjs/common';
import { EcommerceService } from './ecommerce.service';
import { ShoppingSessionService } from './shopping-session.service';
import { MetaCatalogService } from './meta-catalog.service';
import axios from 'axios';

@Injectable()
export class WhatsappEcommerceService {
  constructor(
    private ecommerceService: EcommerceService,
    private sessionService: ShoppingSessionService,
    public metaCatalogService: MetaCatalogService,
  ) {}

  async handleIncomingMessage(phone: string, message: string, accessToken: string, phoneNumberId: string, userId: number) {
    const msg = message.toLowerCase().trim();

    if (msg === 'shop' || msg === 'catalog' || msg === 'products') {
      return this.metaCatalogService.sendCatalogMessage(phone, phoneNumberId, userId);
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
    const products = await this.ecommerceService.getProducts(subCategoryId, userId);

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

    await this.sessionService.setProductForPurchase(phone, productId);

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

    await this.sessionService.setProductForPurchase(phone, productId);

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
    const productId = await this.sessionService.getProductForPurchase(phone);
    if (!productId) {
      return this.sendWhatsAppMessage(phone, {
        type: 'text',
        text: { body: 'Please select a product first. Send "shop" to browse products.' },
      }, accessToken, phoneNumberId);
    }

    const product = await this.ecommerceService.getProduct(productId, userId);
    if (!product) return;

    await this.sessionService.setPaymentMethod(phone, 'COD');
    await this.sessionService.setSession(phone, { step: 'awaiting_name' });

    return this.sendWhatsAppMessage(phone, {
      type: 'text',
      text: {
        body: `📦 *Order Details*\n\nProduct: ${product.name}\nPrice: ₹${product.price}\nPayment: Cash on Delivery\n\nPlease provide your full name:`,
      },
    }, accessToken, phoneNumberId);
  }

  async createOrderFromMessage(phone: string, message: string, userId: number) {
    const step = await this.sessionService.getStep(phone);
    
    if (step === 'awaiting_name') {
      await this.sessionService.setCustomerName(phone, message.trim());
      return 'awaiting_address';
    }
    
    if (step === 'awaiting_address') {
      await this.sessionService.setCustomerAddress(phone, message.trim());
      return 'awaiting_city';
    }
    
    if (step === 'awaiting_city') {
      await this.sessionService.setCustomerCity(phone, message.trim());
      return 'awaiting_pincode';
    }
    
    if (step === 'awaiting_pincode') {
      await this.sessionService.setCustomerPincode(phone, message.trim());
      
      const productId = await this.sessionService.getProductForPurchase(phone);
      const customerName = await this.sessionService.getCustomerName(phone);
      const customerAddress = await this.sessionService.getCustomerAddress(phone);
      const customerCity = await this.sessionService.getCustomerCity(phone);
      
      if (!productId || !customerName || !customerAddress || !customerCity) return false;
      
      const product = await this.ecommerceService.getProduct(productId, userId);
      if (!product) return false;
      
      const fullAddress = `${customerAddress}, ${customerCity}, ${message.trim()}`;
      
      await this.ecommerceService.createOrder({
        customerName,
        customerPhone: phone,
        customerAddress: fullAddress,
        productId,
        quantity: 1,
        totalAmount: product.price,
      }, userId);
      
      await this.sessionService.clearSession(phone);
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
