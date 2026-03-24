import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { EcommerceService } from './ecommerce.service';
import { ShoppingSessionService } from './shopping-session.service';
import { RazorpayService } from './razorpay.service';
import { FlowTriggerService } from '../flow-message/flow-trigger.service';
import { CustomerDetailsFlowService } from '../whatsapp/flows/customer-details-flow.service';

@Injectable()
export class MetaCatalogService {
  private readonly catalogId = process.env.META_CATALOG_ID;
  private readonly accessToken = process.env.META_ACCESS_TOKEN;
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';
  private catalogCache: { products: any[], timestamp: number } | null = null;
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly axiosInstance;

  constructor(
    private ecommerceService: EcommerceService,
    private sessionService: ShoppingSessionService,
    private razorpayService: RazorpayService,
    private flowTriggerService: FlowTriggerService,
    private customerDetailsFlowService: CustomerDetailsFlowService
  ) {
    // Create dedicated axios instance with proper timeout
    this.axiosInstance = axios.create({
      timeout: 30000, // 30 seconds
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async syncProductToCatalog(product: any, meta?: any) {
    try {
      // Validate Meta credentials
      if (!this.catalogId || !this.accessToken) {
        throw new Error('Meta Catalog ID or Access Token not configured');
      }

      console.log('[Meta Sync] Starting sync for product:', product.id);

      const imageUrl = product.imageUrl?.startsWith('http')
        ? product.imageUrl
        : `${process.env.UPLOAD_URL}${product.imageUrl}`;
  
      const toCents = (val: any) => {
        const n = typeof val === 'string' ? parseFloat(val) : val;
        if (n === undefined || n === null || Number.isNaN(n)) return undefined;
        return Math.round(n * 100);
      };
  
      const metaAvailability = (isActive: boolean, availability: boolean) => {
        if (!isActive) return 'out of stock';
        return availability ? 'in stock' : 'out of stock';
      };
  
      const baseRetailerId = (meta?.contentId && String(meta.contentId).trim())
        ? String(meta.contentId).trim()
        : `product_${product.id}`;
  
      // ✅ If variants exist, upload each variant as separate item grouped by item_group_id
      if (Array.isArray(meta?.variants) && meta.variants.length > 0) {
        const results: any[] = [];
  
        for (let i = 0; i < meta.variants.length; i++) {
          const v = meta.variants[i];
  
          const variantRetailerId = (v?.contentId && String(v.contentId).trim())
            ? String(v.contentId).trim()
            : `${baseRetailerId}_v${i + 1}`;
  
          const payload: any = {
            retailer_id: variantRetailerId,
            item_group_id: baseRetailerId,
  
            name: v?.name || meta?.name || product.name,
            description: v?.description || meta?.description || product.description || product.name,
  
            price: toCents(v?.price ?? meta?.price ?? product.price),
            sale_price: toCents(v?.salePrice ?? meta?.salePrice),
  
            currency: 'INR',
            availability: metaAvailability(
              v?.isActive ?? meta?.isActive ?? true,
              v?.availability ?? meta?.availability ?? true,
            ),
  
            condition: 'new',
            brand: 'Store',
            image_url: imageUrl,
            url: v?.link || meta?.link || product.link || imageUrl,
          };
  
          console.log(`[Meta Sync] Uploading variant ${i + 1}/${meta.variants.length}:`, variantRetailerId);
          const resp = await this.axiosInstance.post(
            `${this.apiUrl}/${this.catalogId}/products`,
            payload,
          );
  
          console.log(`[Meta Sync] Variant uploaded successfully:`, resp.data?.id);
          results.push({ retailer_id: variantRetailerId, metaId: resp.data?.id });
        }
  
        return { success: true, type: 'variants', metaProductId: results[0]?.metaId, results };
      }
  
      // ✅ No variants: upload single product
      const payload: any = {
        retailer_id: baseRetailerId,
        name: meta?.name || product.name,
        description: meta?.description || product.description || product.name,
  
        price: toCents(meta?.price ?? product.price),
        sale_price: toCents(meta?.salePrice),
  
        currency: 'INR',
        availability: metaAvailability(meta?.isActive ?? true, meta?.availability ?? true),
  
        condition: 'new',
        brand: 'Store',
        image_url: imageUrl,
        url: meta?.link || product.link || imageUrl,
      };
  
      console.log('[Meta Sync] Uploading product:', baseRetailerId);
      const response = await this.axiosInstance.post(
        `${this.apiUrl}/${this.catalogId}/products`,
        payload,
      );
  
      console.log('[Meta Sync] Product uploaded successfully:', response.data.id);
      return { success: true, data: response.data, metaProductId: response.data.id };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.status;
      const errorDetails = error.response?.data;
      
      console.error('[Meta Sync Error]', {
        status: errorCode,
        message: errorMsg,
        details: errorDetails,
        catalogId: this.catalogId,
        hasToken: !!this.accessToken,
        errorCode: error.code,
      });
      
      // Provide specific error messages
      if (errorCode === 401 || errorCode === 403) {
        throw new Error('Meta API authentication failed. Check your access token and permissions.');
      } else if (errorCode === 429) {
        throw new Error('Meta API rate limit exceeded. Please try again later.');
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('Meta API request timed out. Please try again.');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to Meta API. Check your internet connection.');
      }
      
      throw new Error(errorMsg || 'Failed to sync to Meta Catalog');
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
          timeout: 30000, // 30 seconds
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
            timeout: 30000, // 30 seconds
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
          timeout: 30000, // 30 seconds
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
    console.log(`[Meta Catalog] Total products in cart: ${productItems.length}`);
    
    const allProducts = await this.ecommerceService.getProducts(undefined, userId);
    const cartProducts: any[] = [];
    let totalAmount = 0;
    
    for (const item of productItems) {
      const catalogItemId = item.catalog_item_id || item.product_retailer_id;
      const quantity = item.quantity || 1;
      
      let product;
      if (catalogItemId?.startsWith('product_')) {
        const prodId = parseInt(catalogItemId.replace('product_', ''));
        product = allProducts.find(p => p.id === prodId);
      }
      if (!product) {
        product = allProducts.find(p => p.metaProductId === catalogItemId);
      }
      
      if (product) {
        cartProducts.push({ ...product, quantity });
        totalAmount += product.price * quantity;
      }
    }
    
    console.log(`[Meta Catalog] Cart products:`, cartProducts.map(p => ({ name: p.name, qty: p.quantity })));
    
    // Save cart to session
    await this.sessionService.setSession(phone, { 
      cartProducts,
      totalAmount,
      step: 'awaiting_flow_response'
    }, userId);
    
    // Check if customer exists
    const existingCustomer = await this.ecommerceService.getCustomerByPhone(phone, userId);
    
    if (existingCustomer) {
      // Show existing customer details with options
      await this.sendCustomerDetailsConfirmation(phone, phoneNumberId, existingCustomer, userId);
    } else {
      // Send customer details flow for new customer
      if (process.env.CUSTOMER_FLOW_ID) {
        await this.flowTriggerService.sendFlowMessage({
          to: phone,
          phoneNumberId,
          flowId: process.env.CUSTOMER_FLOW_ID,
          flowToken: `order_${Date.now()}`
        });
      } else {
        await this.sendTextMessage(phone, phoneNumberId, '📦 Great! To complete your order, please provide your details.\n\n_Type EXIT anytime to cancel_');
      }
    }
  }

  async handleCustomerResponse(phone: string, phoneNumberId: string, message: string, userId: number) {
    try {
      const step = await this.sessionService.getStep(phone, userId);
      
      console.log(`[Meta Catalog] handleCustomerResponse called - Phone: ${phone}, Step: ${step}, Message: "${message}"`);
      
      if (!step) {
        console.log(`[Meta Catalog] No step found, returning false`);
        return false;
      }
      
      // Check for EXIT command
      if (message.toUpperCase() === 'EXIT') {
        await this.sessionService.clearSession(phone, userId);
        await this.sendTextMessage(phone, phoneNumberId, '❌ Order cancelled. Type SHOP to browse products again.');
        return true;
      }
      
      if (step === 'confirm_details') {
        const response = message.toLowerCase();
        console.log(`[Meta Catalog] In confirm_details step, response: "${response}", original: "${message}"`);
        
        if (response === 'confirm' || response === 'use my details' || message === 'Use My Details') {
          console.log(`[Meta Catalog] Matched 'Use My Details' - sending payment method selection`);
          await this.sendPaymentMethodSelection(phone, phoneNumberId, userId);
          return true;
        } else if (response === 'update' || response === 'update details' || message === 'Update Details') {
          console.log(`[Meta Catalog] Matched 'Update Details' - opening flow`);
          // Clear existing details and open flow
          await this.sessionService.setSession(phone, { 
            customerName: undefined,
            customerAddress: undefined,
            customerCity: undefined,
            customerState: undefined,
            customerPincode: undefined,
            step: 'awaiting_flow_response' 
          }, userId);
          
          if (process.env.CUSTOMER_FLOW_ID) {
            await this.flowTriggerService.sendFlowMessage({
              to: phone,
              phoneNumberId,
              flowId: process.env.CUSTOMER_FLOW_ID,
              flowToken: `order_${Date.now()}`,
              bodyText: '📝 Update your order details'
            });
          } else {
            await this.sendTextMessage(phone, phoneNumberId, '📝 Please provide your updated details.');
          }
          return true;
        } else if (response === 'someone_else' || response === 'order for someone' || message === 'Order for Someone') {
          // Clear existing details and open flow for new recipient
          await this.sessionService.setSession(phone, { 
            customerName: undefined,
            customerAddress: undefined,
            customerCity: undefined,
            customerState: undefined,
            customerPincode: undefined,
            step: 'awaiting_flow_response' 
          }, userId);
          
          if (process.env.CUSTOMER_FLOW_ID) {
            await this.flowTriggerService.sendFlowMessage({
              to: phone,
              phoneNumberId,
              flowId: process.env.CUSTOMER_FLOW_ID,
              flowToken: `order_${Date.now()}`,
              bodyText: '🎁 Enter recipient order details'
            });
          } else {
            await this.sendTextMessage(phone, phoneNumberId, '🎁 Ordering for someone else! Please provide recipient\'s details.');
          }
          return true;
        }
        return true;
      }
      
      if (step === 'awaiting_payment_method') {
        const method = message.toLowerCase();
        const originalMessage = message;
        
        // Check if it's a valid payment method selection
        const isRazorpay = method === 'payment_razorpay' || method === 'pay online' || originalMessage === 'Pay Online';
        const isCOD = method === 'payment_cod' || method === 'cash on delivery' || originalMessage === 'Cash on Delivery';
        
        if (!isRazorpay && !isCOD) {
          await this.sendTextMessage(phone, phoneNumberId, '❌ Invalid option. Please choose a payment method.');
          return true;
        }
        
        const paymentMethod = isRazorpay ? 'razorpay' : 'cod';
        console.log(`[Meta Catalog] Payment method selected: ${paymentMethod}`);
        
        await this.sessionService.setPaymentMethod(phone, paymentMethod, userId);
        const session = await this.sessionService.getSession(phone, userId);
        const cartProducts = session?.cartProducts || [];
        const totalAmount = session?.totalAmount || 0;
        
        if (cartProducts.length > 0 && session) {
          // Get full state name from state code
          const stateMap = {
            "AN": "Andaman and Nicobar Islands",
            "AP": "Andhra Pradesh",
            "AR": "Arunachal Pradesh",
            "AS": "Assam",
            "BR": "Bihar",
            "CH": "Chandigarh",
            "CT": "Chhattisgarh",
            "DN": "Dadra and Nagar Haveli and Daman and Diu",
            "DL": "Delhi",
            "GA": "Goa",
            "GJ": "Gujarat",
            "HR": "Haryana",
            "HP": "Himachal Pradesh",
            "JK": "Jammu and Kashmir",
            "JH": "Jharkhand",
            "KA": "Karnataka",
            "KL": "Kerala",
            "LA": "Ladakh",
            "LD": "Lakshadweep",
            "MP": "Madhya Pradesh",
            "MH": "Maharashtra",
            "MN": "Manipur",
            "ML": "Meghalaya",
            "MZ": "Mizoram",
            "NL": "Nagaland",
            "OR": "Odisha",
            "PY": "Puducherry",
            "PB": "Punjab",
            "RJ": "Rajasthan",
            "SK": "Sikkim",
            "TN": "Tamil Nadu",
            "TG": "Telangana",
            "TR": "Tripura",
            "UP": "Uttar Pradesh",
            "UT": "Uttarakhand",
            "WB": "West Bengal"
          };
          
          const fullStateName = session.customerState ? (stateMap[session.customerState] || session.customerState) : '';
          
          const orders: any[] = [];
          console.log(`[Meta Catalog] Creating single order for ${cartProducts.length} products`);
          console.log(`[Meta Catalog] Cart products data:`, cartProducts.map(p => ({ id: p.id, productId: p.productId, price: p.price, qty: p.quantity })));
          
          // Create order items for all products
          const orderItems = cartProducts.map(cartItem => ({
            productId: cartItem.productId || cartItem.id,
            quantity: cartItem.quantity || 1,
            price: cartItem.price
          }));
          
          // Create single order with all items including full state name
          const order = await this.ecommerceService.createOrder({
            customerName: session.customerName,
            customerPhone: phone,
            customerAddress: session.customerAddress,
            customerCity: session.customerCity,
            customerState: fullStateName, // Store full state name
            customerPincode: session.customerPincode,
            totalAmount,
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'cod' ? 'cod' : 'pending',
            status: paymentMethod === 'cod' ? 'placed' : 'pending',
            items: orderItems
          }, userId);
          
          console.log(`[Meta Catalog] Single order created:`, { orderId: order.id, itemCount: orderItems.length });
          orders.push(order);
          
          if (paymentMethod === 'razorpay') {
            try {
              const items = cartProducts.map(p => ({
                name: p.name,
                price: p.price,
                quantity: p.quantity
              }));
              
              await this.razorpayService.sendPaymentRequestMultiple(
                phone,
                phoneNumberId,
                totalAmount,
                orders[0].id,
                items
              );
            } catch (error) {
              console.error('Payment link error:', error);
              const productList = cartProducts.map(p => `${p.name} x${p.quantity}`).join('\n');
              await this.sendTextMessage(phone, phoneNumberId, `✅ *Order Placed*\n\n${productList}\nTotal: ₹${totalAmount}\n\nOur team will send you payment link shortly 📞`);
            }
          } else {
            const productList = cartProducts.map(p => `${p.name} (x${p.quantity}) - ₹${p.price * p.quantity}`).join('\n');
            const confirmationMessage = `✅ *Order Confirmed*\n\n${productList}\n\nTotal: ₹${totalAmount}\nPayment: Cash on Delivery\n\n*Delivery Details:*\nName: ${session.customerName}\nAddress: ${session.customerAddress}\nCity: ${session.customerCity}\nState: ${fullStateName}\nPincode: ${session.customerPincode}\n\nOur team will contact you soon 😊`;
            await this.sendTextMessage(phone, phoneNumberId, confirmationMessage);
          }
          
          await this.sessionService.clearSession(phone, userId);
          return true;
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
          timeout: 30000, // 30 seconds
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
                    id: 'payment_razorpay',
                    title: 'Pay Online'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'payment_cod',
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
          timeout: 30000, // 30 seconds
        }
      );
      await this.sessionService.setSession(phone, { step: 'awaiting_payment_method' }, userId);
    } catch (error) {
      console.error('Send payment method error:', error.response?.data || error.message);
    }
  }

  private async sendCustomerDetailsConfirmation(phone: string, phoneNumberId: string, customer: any, userId: number) {
    try {
      const name = customer.customerName || 'Not provided';
      const city = customer.customerCity || '';
      const state = customer.customerState || '';
      const pincode = customer.customerPincode || '';
      
      // Build full address
      let address = customer.customerAddress || 'Not provided';
      if (address !== 'Not provided') {
        const addressParts = [customer.customerAddress, city, state, pincode].filter(p => p && p !== 'undefined');
        address = addressParts.join(', ');
      }
      
      // Save customer details to session for later use
      await this.sessionService.setSession(phone, {
        customerName: customer.customerName,
        customerAddress: customer.customerAddress,
        customerCity: customer.customerCity,
        customerState: customer.customerState,
        customerPincode: customer.customerPincode,
        step: 'confirm_details'
      }, userId);
      
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
          timeout: 30000, // 30 seconds
        }
      );
    } catch (error) {
      console.error('Send customer details error:', error.response?.data || error.message);
    }
  }

  async handleCustomerDetailsFlowResponse(phone: string, phoneNumberId: string, customerData: any, userId: number) {
    try {
      console.log(`[Meta Catalog] Processing customer details flow response for ${phone}`);
      console.log(`[Meta Catalog] Customer data:`, customerData);
      
      const session = await this.sessionService.getSession(phone, userId);
      if (!session || !session.cartProducts) {
        await this.sendTextMessage(phone, phoneNumberId, '❌ Session expired. Please start shopping again by typing SHOP.');
        return;
      }
      
      const { cartProducts, totalAmount } = session;
      const paymentMethod = customerData.paymentMethod || 'cod';
      
      if (!totalAmount) {
        await this.sendTextMessage(phone, phoneNumberId, '❌ Session expired. Please start shopping again by typing SHOP.');
        return;
      }
      
      // Get full state name from state code
      const stateMap = {
        "AN": "Andaman and Nicobar Islands",
        "AP": "Andhra Pradesh",
        "AR": "Arunachal Pradesh",
        "AS": "Assam",
        "BR": "Bihar",
        "CH": "Chandigarh",
        "CT": "Chhattisgarh",
        "DN": "Dadra and Nagar Haveli and Daman and Diu",
        "DL": "Delhi",
        "GA": "Goa",
        "GJ": "Gujarat",
        "HR": "Haryana",
        "HP": "Himachal Pradesh",
        "JK": "Jammu and Kashmir",
        "JH": "Jharkhand",
        "KA": "Karnataka",
        "KL": "Kerala",
        "LA": "Ladakh",
        "LD": "Lakshadweep",
        "MP": "Madhya Pradesh",
        "MH": "Maharashtra",
        "MN": "Manipur",
        "ML": "Meghalaya",
        "MZ": "Mizoram",
        "NL": "Nagaland",
        "OR": "Odisha",
        "PY": "Puducherry",
        "PB": "Punjab",
        "RJ": "Rajasthan",
        "SK": "Sikkim",
        "TN": "Tamil Nadu",
        "TG": "Telangana",
        "TR": "Tripura",
        "UP": "Uttar Pradesh",
        "UT": "Uttarakhand",
        "WB": "West Bengal"
      };
      
      const fullStateName = customerData.customerState ? (stateMap[customerData.customerState] || customerData.customerState) : '';
      
      // Create order items
      const orderItems = cartProducts.map(cartItem => ({
        productId: cartItem.productId || cartItem.id,
        quantity: cartItem.quantity || 1,
        price: cartItem.price
      }));
      
      // Create order with individual address fields
      const order = await this.ecommerceService.createOrder({
        customerName: customerData.customerName,
        customerPhone: phone,
        customerAddress: customerData.customerAddress,
        customerCity: customerData.customerCity,
        customerState: fullStateName, // Store full state name
        customerPincode: customerData.customerPincode,
        totalAmount,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'cod' : 'pending',
        status: paymentMethod === 'cod' ? 'placed' : 'pending',
        items: orderItems
      }, userId);
      
      console.log(`[Meta Catalog] Order created via flow:`, { orderId: order.id, itemCount: orderItems.length });
      
      // Handle payment
      if (paymentMethod === 'razorpay') {
        try {
          const items = cartProducts.map(p => ({
            name: p.name,
            price: p.price,
            quantity: p.quantity
          }));
          
          await this.razorpayService.sendPaymentRequestMultiple(
            phone,
            phoneNumberId,
            totalAmount,
            order.id,
            items
          );
        } catch (error) {
          console.error('Payment link error:', error);
          const productList = cartProducts.map(p => `${p.name} x${p.quantity}`).join('\n');
          await this.sendTextMessage(phone, phoneNumberId, `✅ *Order Placed*\n\n${productList}\nTotal: ₹${totalAmount}\n\nOur team will send you payment link shortly 📞`);
        }
      } else {
        // COD confirmation with detailed address
        const productList = cartProducts.map(p => `${p.name} (x${p.quantity}) - ₹${p.price * p.quantity}`).join('\n');
        const confirmationMessage = `✅ *Order Confirmed*\n\n${productList}\n\nTotal: ₹${totalAmount}\nPayment: Cash on Delivery\n\n*Delivery Details:*\nName: ${customerData.customerName}\nAddress: ${customerData.customerAddress}\nCity: ${customerData.customerCity}\nState: ${fullStateName}\nPincode: ${customerData.customerPincode}\n\nOur team will contact you soon 😊`;
        await this.sendTextMessage(phone, phoneNumberId, confirmationMessage);
      }
      
      // Clear session
      await this.sessionService.clearSession(phone, userId);
      
    } catch (error) {
      console.error('[Meta Catalog] Error handling customer details flow response:', error);
      await this.sendTextMessage(phone, phoneNumberId, '❌ Something went wrong. Please try again or contact support.');
    }
  }

  private async sendCustomerDetailsFlow(phone: string, phoneNumberId: string, userId: number) {
    try {
      console.log(`[Meta Catalog] Sending customer details flow to ${phone}`);
      
      // Try to send actual flow if CUSTOMER_FLOW_ID is configured
      if (process.env.CUSTOMER_FLOW_ID) {
        await this.flowTriggerService.sendFlowMessage({
          to: phone,
          phoneNumberId,
          flowId: process.env.CUSTOMER_FLOW_ID,
          flowToken: `order_${Date.now()}`
        });
        console.log(`[Meta Catalog] Customer details flow sent successfully`);
      } else {
        // Fallback to text message if flow not configured
        await this.sendTextMessage(phone, phoneNumberId, '📦 Great! To complete your order, please provide your details.\n\n_Type EXIT anytime to cancel_');
        console.log(`[Meta Catalog] Fallback text message sent (no CUSTOMER_FLOW_ID configured)`);
      }
    } catch (error) {
      console.error('[Meta Catalog] Error sending customer details flow:', error);
      // Fallback to text message
      await this.sendTextMessage(phone, phoneNumberId, '📦 Great! To complete your order, please provide your details.\n\n_Type EXIT anytime to cancel_');
    }
  }

  private async getTenantClientForPhone(phoneNumberId: string, userId: number) {
    // Get tenant client - implement based on your needs
    return null;
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
    const productName = orderDetails.items?.[0]?.product?.name || 'Product';
    
    const confirmationMessage = `✅ *Payment Successful!*\n\nOrder #${orderId}\nProduct: ${productName}\nAmount: ₹${orderDetails.totalAmount}\n\nName: ${orderDetails.customerName}\nAddress: ${orderDetails.customerAddress}\n\nYour order is confirmed. We'll contact you soon 🙂`;
    
    await this.sendTextMessage(orderDetails.customerPhone, phoneNumberId, confirmationMessage);
    return order;
  }
}
