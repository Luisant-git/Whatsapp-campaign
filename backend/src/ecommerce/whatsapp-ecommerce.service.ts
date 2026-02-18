import { Injectable } from '@nestjs/common';
import { EcommerceService } from './ecommerce.service';
import { ShoppingSessionService } from './shopping-session.service';
import axios from 'axios';

@Injectable()
export class WhatsappEcommerceService {
  constructor(
    private ecommerceService: EcommerceService,
    private sessionService: ShoppingSessionService,
  ) {}

  async handleIncomingMessage(phone: string, message: string, accessToken: string, phoneNumberId: string, userId: number) {
    const msg = message.toLowerCase().trim();

    if (msg === 'shop' || msg === 'catalog' || msg === 'products') {
      return this.sendCategoryList(phone, accessToken, phoneNumberId, userId);
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

    const buttons = categories.slice(0, 3).map((cat, idx) => ({
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

    console.log('Product details:', {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      startsWithHttp: product.imageUrl?.startsWith('http')
    });

    // Store product in session for purchase
    this.sessionService.setProductForPurchase(phone, productId);

    const message = `*${product.name}*\n\n${product.description}\n\n💰 Price: ₹${product.price}`;

    // Try to upload image to WhatsApp and send by ID with Buy Now button
    if (product.imageUrl && product.imageUrl.trim() !== '' && product.imageUrl.startsWith('http')) {
      try {
        console.log('Uploading image to WhatsApp:', product.imageUrl);
        const mediaId = await this.uploadMediaToWhatsApp(product.imageUrl, accessToken, phoneNumberId);
        
        if (mediaId) {
          console.log('Sending image by media ID:', mediaId);
          // Send image first
          await this.sendWhatsAppMessage(phone, {
            type: 'image',
            image: {
              id: mediaId,
              caption: message,
            },
          }, accessToken, phoneNumberId);
          
          // Then send Buy Now button
          return this.sendWhatsAppMessage(phone, {
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text: 'Click below to purchase:' },
              action: {
                buttons: [{
                  type: 'reply',
                  reply: { id: `buy:${productId}`, title: '🛒 Buy Now' }
                }]
              }
            }
          }, accessToken, phoneNumberId);
        }
      } catch (error) {
        console.log('Failed to upload image to WhatsApp:', error.message);
      }
    }

    // Send text with Buy Now button
    console.log('Sending text message with button');
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

    // Store product in session
    this.sessionService.setProductForPurchase(phone, productId);

    // Show payment options
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
    const productId = this.sessionService.getProductForPurchase(phone);
    if (!productId) {
      return this.sendWhatsAppMessage(phone, {
        type: 'text',
        text: { body: 'Please select a product first. Send "shop" to browse products.' },
      }, accessToken, phoneNumberId);
    }

    const product = await this.ecommerceService.getProduct(productId, userId);
    if (!product) return;

    // Store payment method
    this.sessionService.setPaymentMethod(phone, 'COD');

    return this.sendWhatsAppMessage(phone, {
      type: 'text',
      text: {
        body: `📦 *Order Details*\n\nProduct: ${product.name}\nPrice: ₹${product.price}\nPayment: Cash on Delivery\n\nPlease provide your details:\n\nNAME: Your Full Name\nADDRESS: Your Complete Address`,
      },
    }, accessToken, phoneNumberId);
  }

  private async uploadMediaToWhatsApp(imageUrl: string, accessToken: string, phoneNumberId: string): Promise<string | null> {
    try {
      // Download image from your server
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data);
      
      // Get content type and determine file extension
      const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
      
      // WhatsApp only supports JPEG and PNG
      let finalContentType = contentType;
      let extension = 'jpg';
      
      if (contentType === 'image/png') {
        finalContentType = 'image/png';
        extension = 'png';
      } else {
        // Convert all other formats to JPEG
        finalContentType = 'image/jpeg';
        extension = 'jpg';
      }
      
      // Upload to WhatsApp
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: `product.${extension}`,
        contentType: finalContentType,
      });
      formData.append('messaging_product', 'whatsapp');
      
      const uploadUrl = `https://graph.facebook.com/v17.0/${phoneNumberId}/media`;
      const uploadResponse = await axios.post(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      return uploadResponse.data.id;
    } catch (error) {
      console.error('Error uploading media to WhatsApp:', error.message);
      return null;
    }
  }

  async handleBuyRequest(phone: string, accessToken: string, phoneNumberId: string) {
    const productId = this.sessionService.getProductForPurchase(phone);
    if (!productId) {
      return this.sendWhatsAppMessage(phone, {
        type: 'text',
        text: { body: 'Please select a product first. Send "shop" to browse products.' },
      }, accessToken, phoneNumberId);
    }

    const product = await this.ecommerceService.getProduct(productId);
    if (!product) return;

    return this.sendWhatsAppMessage(phone, {
      type: 'text',
      text: {
        body: `📦 *${product.name}* - ₹${product.price}\n\nPlease provide your details:\n\nNAME: Your Full Name\nADDRESS: Your Complete Address`,
      },
    }, accessToken, phoneNumberId);
  }

  async createOrderFromMessage(phone: string, message: string, userId: number) {
    const nameMatch = message.match(/NAME:\s*(.+)/i);
    const addressMatch = message.match(/ADDRESS:\s*(.+)/i);

    if (!nameMatch || !addressMatch) return false;

    const productId = this.sessionService.getProductForPurchase(phone);
    if (!productId) return false;

    const product = await this.ecommerceService.getProduct(productId, userId);
    if (!product) return false;

    const paymentMethod = this.sessionService.getPaymentMethod(phone) || 'COD';

    await this.ecommerceService.createOrder({
      customerName: nameMatch[1].trim(),
      customerPhone: phone,
      customerAddress: addressMatch[1].trim(),
      productId,
      quantity: 1,
      totalAmount: product.price,
    });

    // Clear session after order
    this.sessionService.clearSession(phone);

    return true;
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
