import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { EcommerceService } from './ecommerce.service';
import { ShoppingSessionService } from './shopping-session.service';

@Injectable()
export class MetaCatalogService {
  private readonly catalogId = process.env.META_CATALOG_ID;
  private readonly accessToken = process.env.META_ACCESS_TOKEN;
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private ecommerceService: EcommerceService,
    private sessionService: ShoppingSessionService
  ) {}

  async syncProductToCatalog(product: any) {
    try {
      const imageUrl = product.imageUrl?.startsWith('http') 
        ? product.imageUrl 
        : `${process.env.UPLOAD_URL}${product.imageUrl}`;

      const productData = {
        retailer_id: `product_${product.id}`,
        name: product.name,
        description: product.description || product.name,
        price: Math.round(product.price * 100),
        currency: 'INR',
        availability: 'in stock',
        condition: 'new',
        brand: 'Store',
        image_url: imageUrl,
        url: product.link || imageUrl,
      };

      const response = await axios.post(
        `${this.apiUrl}/${this.catalogId}/products`,
        productData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Meta Catalog sync error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to sync to Meta Catalog');
    }
  }

  async sendCatalogMessage(phone: string, phoneNumberId: string, userId?: number) {
    try {
      const catalogProducts = await axios.get(
        `${this.apiUrl}/${this.catalogId}/products?fields=id,retailer_id,name,availability`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );
      
      console.log('Products in Meta Catalog:', JSON.stringify(catalogProducts.data, null, 2));
      
      const availableProducts = catalogProducts.data.data.filter(p => 
        p.availability === 'in stock' || !p.availability
      );
      
      console.log('Available products:', availableProducts.length);
      
      const productItems = availableProducts.map(p => ({
        product_retailer_id: p.retailer_id
      }));
      
      console.log('Product items to send:', productItems);
      
      const messagePayload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'product_list',
          header: {
            type: 'text',
            text: 'Our Products'
          },
          body: {
            text: '🛍️ Check out our collection!'
          },
          footer: {
            text: 'Tap to view details'
          },
          action: {
            catalog_id: this.catalogId,
            sections: [
              {
                title: 'Available Now',
                product_items: productItems.slice(0, 30)
              }
            ]
          }
        }
      };
      
      const response = await axios.post(
        `${this.apiUrl}/${phoneNumberId}/messages`,
        messagePayload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Catalog message sent successfully:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Send catalog error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        catalogId: this.catalogId,
        phoneNumberId: phoneNumberId
      });
      throw new Error(error.response?.data?.error?.message || 'Failed to send catalog message');
    }
  }

  async handleOrderMessage(phone: string, phoneNumberId: string, order: any, userId: number) {
    // Extract product info from Meta Catalog order
    const productItems = order.product_items || [];
    
    if (productItems.length > 0) {
      const firstProduct = productItems[0];
      const retailerId = firstProduct.product_retailer_id;
      
      // Extract product ID from retailer_id (format: product_123)
      const productId = retailerId ? parseInt(retailerId.replace('product_', '')) : null;
      
      if (productId) {
        this.sessionService.setProductForPurchase(phone, productId);
      }
    }
    
    this.sessionService.setSession(phone, { step: 'awaiting_name' });
    return this.sendTextMessage(phone, phoneNumberId, '📦 Great! To complete your order, please provide your full name:');
  }

  async handleCustomerResponse(phone: string, phoneNumberId: string, message: string, userId: number) {
    const step = this.sessionService.getStep(phone);
    
    if (step === 'awaiting_name') {
      this.sessionService.setCustomerName(phone, message);
      return this.sendTextMessage(phone, phoneNumberId, 'Thank you! Now please provide your complete delivery address:');
    }
    
    if (step === 'awaiting_address') {
      this.sessionService.setCustomerAddress(phone, message);
      return this.sendTextMessage(phone, phoneNumberId, 'Thank you! Now please provide your city:');
    }
    
    if (step === 'awaiting_city') {
      this.sessionService.setCustomerCity(phone, message);
      return this.sendTextMessage(phone, phoneNumberId, 'Thank you! Finally, please provide your pincode:');
    }
    
    if (step === 'awaiting_pincode') {
      this.sessionService.setCustomerPincode(phone, message);
      
      const session = this.sessionService.getSession(phone);
      const productId = session?.currentProductId;
      
      if (productId) {
        const product = await this.ecommerceService.getProduct(productId, userId);
        if (product) {
          const fullAddress = `${session.customerAddress}, ${session.customerCity}, ${message}`;
          
          await this.ecommerceService.createOrder({
            customerName: session.customerName,
            customerPhone: phone,
            customerAddress: fullAddress,
            productId,
            quantity: 1,
            totalAmount: product.price,
          }, userId);
          
          this.sessionService.clearSession(phone);
          return this.sendTextMessage(phone, phoneNumberId, '✅ Order placed successfully! We will contact you soon for delivery. Thank you for shopping with us!');
        }
      }
    }
    
    return null;
  }

  private async sendTextMessage(phone: string, phoneNumberId: string, text: string) {
    try {
      await axios.post(
        `${this.apiUrl}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: text }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return { success: true };
    } catch (error) {
      console.error('Send text message error:', error.response?.data || error.message);
      throw error;
    }
  }
}
