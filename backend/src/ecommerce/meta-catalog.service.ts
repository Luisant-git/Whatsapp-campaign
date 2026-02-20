import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { EcommerceService } from './ecommerce.service';

@Injectable()
export class MetaCatalogService {
  private readonly catalogId = process.env.META_CATALOG_ID;
  private readonly accessToken = process.env.META_ACCESS_TOKEN;
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';

  constructor(private ecommerceService: EcommerceService) {}

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
      const products = await this.ecommerceService.getProducts(undefined, userId);
      console.log('📦 Products fetched:', products.length);
      console.log('Product IDs:', products.map(p => `product_${p.id}`));
      
      const productItems = products.map(p => ({ product_retailer_id: `product_${p.id}` }));
      console.log('Product items for catalog:', JSON.stringify(productItems, null, 2));
      
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
            text: '🛍️ Browse our collection!'
          },
          action: {
            catalog_id: this.catalogId,
            sections: [
              {
                title: 'Available Products',
                product_items: productItems
              }
            ]
          }
        }
      };
      
      console.log('Sending catalog message payload:', JSON.stringify(messagePayload, null, 2));
      
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
}
