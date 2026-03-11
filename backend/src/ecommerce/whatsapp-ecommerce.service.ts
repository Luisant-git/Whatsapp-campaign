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
    private centralPrisma: CentralPrismaService,
  ) {}

  async handleIncomingMessage(phone: string, message: string, accessToken: string, phoneNumberId: string, userId: number) {
    const msg = message.toLowerCase().trim();

    if (msg === 'shop' || msg === 'catalog' || msg === 'products') {
      try {
        console.log(`[Ecommerce] Handling '${msg}' keyword for ${phone}`);
        
        // Check if Meta Catalog permission is enabled
        const hasMetaCatalog = await this.checkMetaCatalogPermission(userId);
        
        if (hasMetaCatalog) {
          // Use Meta Catalog
          await this.metaCatalogService.sendCatalogMessage(phone, phoneNumberId, userId);
        } else {
          // Use regular ecommerce flow
          await this.sendCategoryList(phone, accessToken, phoneNumberId, userId);
        }
        return true;
      } catch (error) {
        console.error('[Ecommerce] Error handling shop keyword:', error);
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

  private async checkMetaCatalogPermission(userId: number): Promise<boolean> {
    try {
      const tenant = await this.centralPrisma.tenant.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });
      
      if (tenant?.subscription?.menuPermissions) {
        return tenant.subscription.menuPermissions.includes('ecommerce.products.metacatalog');
      }
      return false;
    } catch (error) {
      console.error('[Ecommerce] Error checking Meta Catalog permission:', error);
      return false;
    }
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
    console.log(`[sendProductList] userId: ${userId}, hasMetaCatalog: ${hasMetaCatalog}, excludeMetaProducts: ${!hasMetaCatalog}`);
    
    const products = await this.ecommerceService.getProducts(subCategoryId, userId, !hasMetaCatalog);
    console.log(`[sendProductList] Found ${products.length} products`);
    products.forEach(p => console.log(`  - Product: ${p.name}, metaProductId: ${p.metaProductId}`));

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

    // If product has image, send image with caption and button
    if (product.imageUrl) {
      return this.sendWhatsAppMessage(phone, {
        type: 'interactive',
        interactive: {
          type: 'button',
          header: {
            type: 'image',
            image: {
              link: product.imageUrl.startsWith('http') ? product.imageUrl : `${process.env.BASE_URL || 'http://localhost:3010'}${product.imageUrl}`
            }
          },
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

    // Fallback without image
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
    await this.sessionService.setSession(phone, { step: 'awaiting_payment_method' }, userId);

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
    const step = await this.sessionService.getStep(phone, userId);
    
    if (step !== 'awaiting_payment_method') {
      return this.sendWhatsAppMessage(phone, {
        type: 'text',
        text: { body: 'Please select a product first. Send "shop" to browse products.' },
      }, accessToken, phoneNumberId);
    }

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
    
    // Check if customer has saved details
    const existingCustomer = await this.ecommerceService.getCustomerByPhone(phone, userId);
    
    if (existingCustomer) {
      await this.sessionService.setSession(phone, { 
        cartProducts: cart,
        totalAmount: product.price,
        customerName: existingCustomer.customerName,
        customerAddress: existingCustomer.customerAddress || undefined,
        step: 'confirm_details'
      }, userId);
      
      return this.sendCustomerDetailsConfirmation(phone, accessToken, phoneNumberId, existingCustomer);
    } else {
      await this.sessionService.setSession(phone, { step: 'awaiting_name' }, userId);
      return this.sendWhatsAppMessage(phone, {
        type: 'text',
        text: {
          body: `📦 *Order Details*\n\nProduct: ${product.name}\nPrice: ₹${product.price}\nPayment: Cash on Delivery\n\nPlease provide your full name:`,
        },
      }, accessToken, phoneNumberId);
    }
  }

  async createOrderFromMessage(phone: string, message: string, userId: number, accessToken: string, phoneNumberId: string) {
    const step = await this.sessionService.getStep(phone, userId);
    const trimmedMsg = message.trim();
    
    if (step === 'confirm_details') {
      // Handle both button ID and button title
      if (trimmedMsg === 'Use My Details' || trimmedMsg === 'confirm') {
        const session = await this.sessionService.getSession(phone, userId);
        const cart = session?.cartProducts || [];
        
        if (cart.length > 0 && session) {
          const product = await this.ecommerceService.getProduct(cart[0].productId, userId);
          if (!product) return false;
          
          const fullAddress = session.customerAddress || '';
          
          await this.ecommerceService.createOrder({
            customerName: session.customerName,
            customerPhone: phone,
            customerAddress: fullAddress,
            totalAmount: product.price,
            paymentMethod: 'cod',
            paymentStatus: 'cod',
            status: 'placed',
            items: [{ productId: product.id, quantity: 1, price: product.price }]
          }, userId);
          
          await this.sendWhatsAppMessage(phone, {
            type: 'text',
            text: { body: `✅ *Order Confirmed*\n\nProduct: ${product.name}\nPrice: ₹${product.price}\nPayment: Cash on Delivery\n\nName: ${session.customerName}\nAddress: ${fullAddress}\n\nOur team will contact you soon 🙂` }
          }, accessToken, phoneNumberId);
          
          await this.sessionService.clearSession(phone, userId);
          return 'order_placed';
        }
      } else if (trimmedMsg === 'Update Details' || trimmedMsg === 'update') {
        await this.sessionService.setSession(phone, { step: 'awaiting_name' }, userId);
        return 'awaiting_name';
      } else if (trimmedMsg === 'Order for Someone' || trimmedMsg === 'someone_else') {
        await this.sessionService.setSession(phone, { 
          customerName: undefined,
          customerAddress: undefined,
          step: 'awaiting_name' 
        }, userId);
        return 'awaiting_name';
      }
      return false;
    }
    
    if (step === 'awaiting_name') {
      await this.sessionService.setCustomerName(phone, trimmedMsg, userId);
      await this.sessionService.setSession(phone, { step: 'awaiting_address' }, userId);
      return 'awaiting_address';
    }
    
    if (step === 'awaiting_address') {
      await this.sessionService.setCustomerAddress(phone, trimmedMsg, userId);
      await this.sessionService.setSession(phone, { step: 'awaiting_city' }, userId);
      return 'awaiting_city';
    }
    
    if (step === 'awaiting_city') {
      await this.sessionService.setCustomerCity(phone, trimmedMsg, userId);
      await this.sessionService.setSession(phone, { step: 'awaiting_pincode' }, userId);
      return 'awaiting_pincode';
    }
    
    if (step === 'awaiting_pincode') {
      await this.sessionService.setCustomerPincode(phone, trimmedMsg, userId);
      
      const session = await this.sessionService.getSession(phone, userId);
      const cart = session?.cartProducts || [];
      const customerName = session?.customerName;
      const customerAddress = session?.customerAddress;
      const customerCity = session?.customerCity;
      
      if (cart.length === 0 || !customerName || !customerAddress || !customerCity) return false;
      
      const fullAddress = `${customerAddress}, ${customerCity}, ${trimmedMsg}`;
      const product = await this.ecommerceService.getProduct(cart[0].productId, userId);
      if (!product) return false;
      
      await this.ecommerceService.createOrder({
        customerName,
        customerPhone: phone,
        customerAddress: fullAddress,
        totalAmount: product.price,
        paymentMethod: 'cod',
        paymentStatus: 'cod',
        status: 'placed',
        items: [{ productId: product.id, quantity: 1, price: product.price }]
      }, userId);
      
      await this.sendWhatsAppMessage(phone, {
        type: 'text',
        text: { body: `✅ *Order Confirmed*\n\nProduct: ${product.name}\nPrice: ₹${product.price}\nPayment: Cash on Delivery\n\nName: ${customerName}\nAddress: ${fullAddress}\n\nOur team will contact you soon 🙂` }
      }, accessToken, phoneNumberId);
      
      await this.sessionService.clearSession(phone, userId);
      return 'order_placed';
    }
    
    return false;
  }

  private async sendCustomerDetailsConfirmation(phone: string, accessToken: string, phoneNumberId: string, customer: any) {
    const name = customer.customerName || 'Not provided';
    const address = customer.customerAddress || 'Not provided';
    
    return this.sendWhatsAppMessage(phone, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `👤 *Your Saved Details*\n\nName: ${name}\nAddress: ${address}`
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: { id: 'confirm', title: 'Use My Details' }
            },
            {
              type: 'reply',
              reply: { id: 'update', title: 'Update Details' }
            },
            {
              type: 'reply',
              reply: { id: 'someone_else', title: 'Order for Someone' }
            }
          ]
        }
      }
    }, accessToken, phoneNumberId);
  }

  private async sendWhatsAppMessage(phone: string, message: any, accessToken: string, phoneNumberId: string) {
    try {
      console.log(`[Ecommerce] Sending message to ${phone}`);
      const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
      const response = await axios.post(url, {
        messaging_product: 'whatsapp',
        to: phone,
        ...message,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log(`[Ecommerce] Message sent successfully to ${phone}`);
      return response;
    } catch (error) {
      console.error('[Ecommerce] WhatsApp API Error:', error.response?.data || error.message);
      throw error;
    }
  }
}
