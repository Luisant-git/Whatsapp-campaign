import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { EcommerceService } from './ecommerce.service';
import { ShoppingSessionService } from './shopping-session.service';
import { RazorpayService } from './razorpay.service';

@Injectable()
export class MetaCatalogService {
  private readonly catalogId = process.env.META_CATALOG_ID;
  private readonly accessToken = process.env.META_ACCESS_TOKEN;
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';
  private catalogCache: { products: any[], timestamp: number } | null = null;
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor(
    private ecommerceService: EcommerceService,
    private sessionService: ShoppingSessionService,
    private razorpayService: RazorpayService
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

      return { success: true, data: response.data, metaProductId: response.data.id };
    } catch (error) {
      console.error('Meta Catalog sync error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to sync to Meta Catalog');
    }
  }

  async fetchProductsFromMeta() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${this.catalogId}/products?fields=id,retailer_id,name,description,price,currency,image_url,url,availability`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Fetch Meta products error:', error.response?.data || error.message);
      throw new Error('Failed to fetch products from Meta Catalog');
    }
  }

  async syncMetaProductsToDatabase(userId?: number) {
    try {
      const metaProducts = await this.fetchProductsFromMeta();
      const syncedProducts: any[] = [];
      const existingProducts = await this.ecommerceService.getProducts(undefined, userId);

      console.log('Meta products fetched:', JSON.stringify(metaProducts, null, 2));

      for (const metaProduct of metaProducts) {
        // Check if this product already exists in our database
        const existingProduct = existingProducts.find(p => p.metaProductId === metaProduct.id);
        
        // Skip products that have retailer_id starting with 'product_' AND don't exist in our DB
        // This means they were uploaded from our system but not yet in our DB
        if (metaProduct.retailer_id?.startsWith('product_')) {
          // Extract the product ID from retailer_id
          const productIdFromRetailerId = parseInt(metaProduct.retailer_id.replace('product_', ''));
          // Check if this product exists in our database with this ID
          const uploadedProduct = existingProducts.find(p => p.id === productIdFromRetailerId);
          
          // If found, skip it (it's our uploaded product)
          if (uploadedProduct) {
            console.log(`Skipping uploaded product: ${metaProduct.name} (retailer_id: ${metaProduct.retailer_id})`);
            continue;
          }
        }
        
        console.log(`Processing Meta product: ${metaProduct.name}, raw price data:`, metaProduct.price);
        
        let price = 0;
        if (typeof metaProduct.price === 'string') {
          // Remove currency symbol, commas, and parse
          const cleanPrice = metaProduct.price.replace(/[₹,]/g, '').trim();
          price = parseFloat(cleanPrice);
        } else if (typeof metaProduct.price === 'number') {
          price = metaProduct.price / 100;
        }
        
        console.log(`Converted price: ${price}`);
        
        const productData: any = {
          name: metaProduct.name,
          description: metaProduct.description || '',
          price: price || 0,
          imageUrl: metaProduct.image_url || null,
          link: metaProduct.url || null,
          metaProductId: metaProduct.id,
          source: 'meta',
          subCategoryId: 1,
          isActive: metaProduct.availability === 'in stock',
        };

        if (existingProduct) {
          await this.ecommerceService.updateProduct(existingProduct.id, productData);
          syncedProducts.push({ ...existingProduct, ...productData, action: 'updated' });
        } else {
          const newProduct = await this.ecommerceService.createProduct(productData);
          syncedProducts.push({ ...newProduct, action: 'created' });
        }
      }

      return { success: true, syncedCount: syncedProducts.length, products: syncedProducts };
    } catch (error) {
      console.error('Sync Meta products error:', error.message);
      throw new Error('Failed to sync Meta products to database');
    }
  }

  async sendCatalogMessage(phone: string, phoneNumberId: string, userId?: number) {
    try {
      // Check cache first
      let catalogProducts;
      if (this.catalogCache && (Date.now() - this.catalogCache.timestamp) < this.CACHE_TTL) {
        console.log('Using cached catalog products');
        catalogProducts = { data: { data: this.catalogCache.products } };
      } else {
        console.log('Fetching fresh catalog products');
        catalogProducts = await axios.get(
          `${this.apiUrl}/${this.catalogId}/products?fields=id,retailer_id,name,availability`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );
        // Update cache
        this.catalogCache = {
          products: catalogProducts.data.data,
          timestamp: Date.now()
        };
      }
      
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
    const productItems = order.product_items || [];
    
    console.log(`[Meta Catalog] Full order data:`, JSON.stringify(order, null, 2));
    
    let productId: number | undefined;
    
    if (productItems.length > 0) {
      const firstProduct = productItems[0];
      const catalogItemId = firstProduct.catalog_item_id || firstProduct.product_retailer_id;
      
      console.log(`[Meta Catalog] Order received - catalog_item_id: ${catalogItemId}`);
      console.log(`[Meta Catalog] First product data:`, JSON.stringify(firstProduct, null, 2));
      
      const allProducts = await this.ecommerceService.getProducts(undefined, userId);
      console.log(`[Meta Catalog] All products in DB:`, allProducts.map(p => ({ id: p.id, name: p.name, metaProductId: p.metaProductId })));
      
      let product;
      
      if (catalogItemId?.startsWith('product_')) {
        const prodId = parseInt(catalogItemId.replace('product_', ''));
        product = allProducts.find(p => p.id === prodId);
        console.log(`[Meta Catalog] Trying retailer_id match for ID ${prodId}:`, product ? `Found ${product.name}` : 'Not found');
      }
      
      if (!product) {
        product = allProducts.find(p => p.metaProductId === catalogItemId);
        console.log(`[Meta Catalog] Trying metaProductId match:`, product ? `Found ${product.name}` : 'Not found');
      }
      
      if (product) {
        console.log(`[Meta Catalog] Product found: ${product.name} (ID: ${product.id}, metaProductId: ${product.metaProductId})`);
        productId = product.id;
      } else {
        console.error(`[Meta Catalog] Product not found for catalog_item_id: ${catalogItemId}`);
      }
    }
    
    // Check if customer exists
    const existingCustomer = await this.ecommerceService.getCustomerByPhone(phone, userId);
    
    if (existingCustomer) {
      await this.sessionService.setSession(phone, { 
        currentProductId: productId,
        customerName: existingCustomer.customerName,
        customerAddress: existingCustomer.customerAddress || undefined,
        step: 'confirm_details'
      }, userId);
      
      await this.sendCustomerDetailsConfirmation(phone, phoneNumberId, existingCustomer);
    } else {
      await this.sessionService.setSession(phone, { 
        currentProductId: productId,
        step: 'awaiting_name' 
      }, userId);
      
      return this.sendTextMessage(phone, phoneNumberId, '📦 Great! To complete your order, please provide your full name:');
    }
  }

  async handleCustomerResponse(phone: string, phoneNumberId: string, message: string, userId: number) {
    try {
      const step = await this.sessionService.getStep(phone, userId);
      
      if (!step) {
        return false;
      }
      
      console.log(`[Meta Catalog] Customer ${phone} in step: ${step}, message: ${message}`);
      
      if (step === 'confirm_details') {
        const response = message.toLowerCase();
        
        if (response === 'confirm' || response === 'use my details') {
          await this.sendPaymentMethodSelection(phone, phoneNumberId, userId);
          return true;
        } else if (response === 'update' || response === 'update details') {
          await this.sendUpdateFieldSelection(phone, phoneNumberId, userId);
          return true;
        } else if (response === 'someone_else' || response === 'order for someone') {
          await this.sessionService.setSession(phone, { 
            customerName: undefined,
            customerAddress: undefined,
            customerCity: undefined,
            customerPincode: undefined,
            step: 'awaiting_name' 
          }, userId);
          await this.sendTextMessage(phone, phoneNumberId, '🎁 Ordering for someone else!\n\nPlease provide recipient\'s full name:');
          return true;
        }
        return true;
      }
      
      if (step === 'select_update_field') {
        const field = message.toLowerCase();
        
        if (field === 'name' || field === 'update name') {
          await this.sessionService.setSession(phone, { step: 'awaiting_name' }, userId);
          await this.sendTextMessage(phone, phoneNumberId, 'Please provide your full name:');
          return true;
        } else if (field === 'address' || field === 'update address') {
          await this.sessionService.setSession(phone, { step: 'awaiting_address' }, userId);
          await this.sendTextMessage(phone, phoneNumberId, 'Please provide your complete delivery address:');
          return true;
        }
        return true;
      }
      
      if (step === 'awaiting_name') {
        await this.sessionService.setCustomerName(phone, message, userId);
        await this.sendTextMessage(phone, phoneNumberId, 'Thank you! Now please provide your complete delivery address:');
        return true;
      }
      
      if (step === 'awaiting_address') {
        await this.sessionService.setCustomerAddress(phone, message, userId);
        await this.sendTextMessage(phone, phoneNumberId, 'Thank you! Now please provide your city:');
        return true;
      }
      
      if (step === 'awaiting_city') {
        await this.sessionService.setCustomerCity(phone, message, userId);
        await this.sendTextMessage(phone, phoneNumberId, 'Thank you! Finally, please provide your pincode:');
        return true;
      }
      
      if (step === 'awaiting_pincode') {
        await this.sessionService.setCustomerPincode(phone, message, userId);
        await this.sendPaymentMethodSelection(phone, phoneNumberId, userId);
        return true;
      }
      
      if (step === 'awaiting_payment_method') {
        const method = message.toLowerCase();
        if (method !== 'razorpay' && method !== 'cod' && method !== 'pay online' && method !== 'cash on delivery') {
          await this.sendTextMessage(phone, phoneNumberId, '❌ Invalid option. Please choose a payment method.');
          return true;
        }
        
        const paymentMethod = (method === 'razorpay' || method === 'pay online') ? 'razorpay' : 'cod';
        await this.sessionService.setPaymentMethod(phone, paymentMethod, userId);
        const session = await this.sessionService.getSession(phone, userId);
        const productId = session?.currentProductId;
        
        if (productId) {
          const product = await this.ecommerceService.getProduct(productId, userId);
          
          if (product && session) {
            // Build address: use saved full address OR construct from parts
            let fullAddress;
            if (session.customerAddress && !session.customerCity && !session.customerPincode) {
              // Existing customer with saved full address
              fullAddress = session.customerAddress;
            } else {
              // New customer with individual parts
              fullAddress = [session.customerAddress, session.customerCity, session.customerPincode]
                .filter(part => part && part !== 'undefined')
                .join(', ');
            }
            
            const order = await this.ecommerceService.createOrder({
              customerName: session.customerName,
              customerPhone: phone,
              customerAddress: fullAddress,
              productId,
              quantity: 1,
              totalAmount: product.price,
              paymentMethod: method,
              paymentStatus: method === 'cod' ? 'cod' : 'pending',
            }, userId);
            
            if (method === 'razorpay') {
              try {
                await this.razorpayService.sendPaymentRequest(
                  phone,
                  phoneNumberId,
                  product.price,
                  order.id
                );
              } catch (error) {
                console.error('Payment link error:', error);
                await this.sendTextMessage(phone, phoneNumberId, `✅ *Order Placed*\n\nOrder #${order.id}\nProduct: ${product.name}\nAmount: ₹${product.price}\n\nOur team will send you payment link shortly 📞`);
              }
            } else {
              await this.sendOrderConfirmation(phone, phoneNumberId, product, session, fullAddress);
            }
            
            await this.sessionService.clearSession(phone, userId);
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('[Meta Catalog] Error in handleCustomerResponse:', error);
      return false;
    }
  }

  private async sendTextMessage(phone: string, phoneNumberId: string, text: string) {
    try {
      console.log(`[Meta Catalog] Sending message to ${phone}: ${text}`);
      const response = await axios.post(
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
      console.log(`[Meta Catalog] Message sent successfully:`, response.data);
      return { success: true };
    } catch (error) {
      console.error('[Meta Catalog] Send text message error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  private async sendPaymentMethodSelection(phone: string, phoneNumberId: string, userId: number) {
    try {
      await axios.post(
        `${this.apiUrl}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: '💳 *Choose Payment Method*'
            },
            action: {
              buttons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'razorpay',
                    title: 'Pay Online'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'cod',
                    title: 'Cash on Delivery'
                  }
                }
              ]
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      await this.sessionService.setSession(phone, { step: 'awaiting_payment_method' }, userId);
    } catch (error) {
      console.error('Send payment method error:', error.response?.data || error.message);
    }
  }

  private async sendCustomerDetailsConfirmation(phone: string, phoneNumberId: string, customer: any) {
    try {
      const name = customer.customerName || 'Not provided';
      let address = customer.customerAddress || 'Not provided';
      
      // Clean up address by removing 'undefined' strings
      if (address !== 'Not provided') {
        address = address.split(',').map(part => part.trim()).filter(part => part && part !== 'undefined').join(', ');
      }
      
      await axios.post(
        `${this.apiUrl}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
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
                  reply: {
                    id: 'confirm',
                    title: 'Use My Details'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'update',
                    title: 'Update Details'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'someone_else',
                    title: 'Order for Someone'
                  }
                }
              ]
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Send customer details error:', error.response?.data || error.message);
    }
  }

  private async sendUpdateFieldSelection(phone: string, phoneNumberId: string, userId: number) {
    try {
      await axios.post(
        `${this.apiUrl}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: '✏️ *What would you like to update?*'
            },
            action: {
              buttons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'name',
                    title: 'Update Name'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'address',
                    title: 'Update Address'
                  }
                }
              ]
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      await this.sessionService.setSession(phone, { step: 'select_update_field' }, userId);
    } catch (error) {
      console.error('Send update field selection error:', error.response?.data || error.message);
    }
  }

  private async sendOrderConfirmation(phone: string, phoneNumberId: string, product: any, session: any, fullAddress: string) {
    const confirmationMessage = `✅ *Order Confirmed*\n\nProduct: ${product.name}\nPrice: ₹${product.price}\nPayment: Cash on Delivery\n\nName: ${session.customerName}\nAddress: ${fullAddress}\n\nOur team will contact you soon 🙂`;
    await this.sendTextMessage(phone, phoneNumberId, confirmationMessage);
  }

  private async sendOrderDetailsWithPayment(phone: string, phoneNumberId: string, product: any, orderId: number, customerName: string, address: string) {
    try {
      await axios.post(
        `${this.apiUrl}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'interactive',
          interactive: {
            type: 'order_details',
            body: {
              text: `*Order #${orderId}*\n\n${customerName}\n${address}`
            },
            action: {
              name: 'review_and_pay',
              parameters: {
                reference_id: `order_${orderId}`,
                type: 'digital-goods',
                payment_type: 'upi',
                payment_configuration: 'Razorpay_Payment',
                currency: 'INR',
                total_amount: {
                  value: product.price * 100,
                  offset: 100
                },
                order: {
                  status: 'pending',
                  subtotal: {
                    value: product.price * 100,
                    offset: 100
                  },
                  items: [{
                    name: product.name,
                    amount: {
                      value: product.price * 100,
                      offset: 100
                    },
                    quantity: 1
                  }]
                }
              }
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Send order details with payment error:', error.response?.data || error.message);
      await this.sendTextMessage(phone, phoneNumberId, `✅ *Order Placed*\n\nOrder #${orderId}\nProduct: ${product.name}\nAmount: ₹${product.price}\n\nOur team will contact you with payment link 📞`);
    }
  }

  async handlePaymentSuccess(orderId: number, paymentId: string, userId: number) {
    const order = await this.ecommerceService.updateOrder(orderId, {
      paymentStatus: 'paid',
      status: 'confirmed',
    }, userId);
    
    const orderDetails = await this.ecommerceService.getOrder(orderId, userId);
    if (!orderDetails) return order;
    
    const phoneNumberId = process.env.PHONE_NUMBER_ID || '';
    
    const confirmationMessage = `✅ *Payment Successful!*\n\nOrder #${orderId}\nProduct: ${orderDetails.product.name}\nAmount: ₹${orderDetails.totalAmount}\n\nName: ${orderDetails.customerName}\nAddress: ${orderDetails.customerAddress}\n\nYour order is confirmed. We'll contact you soon 🙂`;
    
    await this.sendTextMessage(orderDetails.customerPhone, phoneNumberId, confirmationMessage);
    return order;
  }
}
