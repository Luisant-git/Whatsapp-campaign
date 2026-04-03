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
  
      // ✅ CRITICAL: If variants exist, ONLY upload variants (NOT the parent product)
      // Commerce Manager will automatically group them by item_group_id
      if (Array.isArray(meta?.variants) && meta.variants.length > 0) {
        console.log(`[Meta Sync] Product has ${meta.variants.length} variants. Uploading ONLY variants (not parent product).`);
        
        const results: any[] = [];
        
        // ✅ CRITICAL: Use IDENTICAL values for all variants to ensure proper grouping
        const sharedName = meta?.name || product.name;
        const sharedDescription = meta?.description || product.description || product.name;
        const sharedBrand = meta?.brand || 'Store';
        const sharedUrl = meta?.link || product.link || imageUrl;
        
        // Validate that all variants have required variant attributes
        const hasVariantAttributes = meta.variants.every(v => 
          v.size || v.color || v.pattern || v.gender || v.material
        );
        
        if (!hasVariantAttributes) {
          console.warn('[Meta Sync] ⚠️ WARNING: At least one variant attribute (size, color, pattern, gender, material) is REQUIRED for proper variant grouping in Meta Catalog!');
        }
  
        for (let i = 0; i < meta.variants.length; i++) {
          const v = meta.variants[i];
  
          const variantRetailerId = (v?.contentId && String(v.contentId).trim())
            ? String(v.contentId).trim()
            : `${baseRetailerId}_v${i + 1}`;
          
          // Use variant-specific image if available, otherwise use base image
          const variantImageUrl = v?.imageUrl?.startsWith('http')
            ? v.imageUrl
            : v?.imageUrl
            ? `${process.env.UPLOAD_URL}${v.imageUrl}`
            : imageUrl;
  
          const payload: any = {
            retailer_id: variantRetailerId,
            item_group_id: baseRetailerId, // Groups all variants together
  
            // ✅ CRITICAL: Use IDENTICAL shared values for proper grouping
            name: sharedName,
            description: sharedDescription,
            brand: sharedBrand,
            url: sharedUrl,
  
            price: toCents(v?.price ?? meta?.price ?? product.price),
            sale_price: toCents(v?.salePrice ?? meta?.salePrice),
  
            currency: 'INR',
            availability: metaAvailability(
              v?.isActive ?? meta?.isActive ?? true,
              v?.availability ?? meta?.availability ?? true,
            ),
  
            condition: 'new',
            
            // ✅ Use variant-specific image (e.g., red shirt shows red image)
            image_url: variantImageUrl,
          };
          
          // ✅ Add variant attributes (REQUIRED by Meta for proper variant grouping)
          if (v.size) payload.size = v.size;
          if (v.color) payload.color = v.color;
          if (v.pattern) payload.pattern = v.pattern;
          if (v.gender) payload.gender = v.gender;
          if (v.material) payload.material = v.material;
          if (v.ageGroup) payload.age_group = v.ageGroup;
          
          // For custom variant attributes
          if (v.customAttribute) {
            payload.additional_variant_attribute = v.customAttribute;
          }
  
          console.log(`[Meta Sync] Uploading variant ${i + 1}/${meta.variants.length}:`, variantRetailerId, `(${v.size || ''} ${v.color || ''})`.trim());
          const resp = await this.axiosInstance.post(
            `${this.apiUrl}/${this.catalogId}/products`,
            payload,
          );
  
          console.log(`[Meta Sync] Variant uploaded successfully:`, resp.data?.id);
          results.push({ 
            retailer_id: variantRetailerId, 
            metaId: resp.data?.id,
            size: v.size,
            color: v.color
          });
        }
  
        return { success: true, type: 'variants', metaProductId: results[0]?.metaId, results };
      }
  
      // ✅ No variants: upload single product
      const payload: any = {
        retailer_id: baseRetailerId,
        name: meta?.name || product.name,
        description: meta?.description || product.description || product.name,
  
        price: toCents(meta?.price ?? product.price),
        sale_price: toCents(meta?.salePrice ?? product.salePrice),
  
        currency: 'INR',
        availability: metaAvailability(meta?.isActive ?? product.isActive ?? true, meta?.availability ?? product.availability ?? true),
  
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

  async updateProductInCatalog(product: any, meta?: any) {
    const baseRetailerId = (meta?.contentId && String(meta.contentId).trim())
      ? String(meta.contentId).trim()
      : product.contentId || `product_${product.id}`;
    
    try {
      if (!this.catalogId || !this.accessToken) {
        throw new Error('Meta Catalog ID or Access Token not configured');
      }

      console.log('[Meta Update] Starting update for product:', product.id, 'metaProductId:', product.metaProductId);

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

      // Delete old product first if metaProductId exists
      if (product.metaProductId) {
        try {
          console.log('[Meta Update] Deleting old product:', product.metaProductId);
          await this.axiosInstance.delete(
            `${this.apiUrl}/${product.metaProductId}`,
          );
          console.log('[Meta Update] Old product deleted successfully');
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (deleteError) {
          const errorCode = deleteError.response?.status;
          console.log('[Meta Update] Delete error:', errorCode, deleteError.message);
          if (errorCode !== 404) {
            try {
              console.log('[Meta Update] Trying to delete by retailer_id:', baseRetailerId);
              await this.deleteProductByRetailerId(baseRetailerId);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
              console.log('[Meta Update] Could not delete by retailer_id:', err.message);
            }
          }
        }
      }
      
      // Delete all old variants if they exist
      if (product.variants && product.variants.length > 0) {
        console.log(`[Meta Update] Deleting ${product.variants.length} old variants...`);
        for (const variant of product.variants) {
          if (variant.metaProductId) {
            try {
              await this.axiosInstance.delete(`${this.apiUrl}/${variant.metaProductId}`);
              console.log(`[Meta Update] Deleted variant: ${variant.metaProductId}`);
            } catch (err) {
              console.log(`[Meta Update] Could not delete variant ${variant.metaProductId}:`, err.message);
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // ✅ If product has variants, upload as variant group
      if (meta?.variants && meta.variants.length > 0) {
        console.log(`[Meta Update] Uploading product with ${meta.variants.length} variants...`);
        
        const results: any[] = [];
        
        // ✅ CRITICAL: Use IDENTICAL values for all variants
        const sharedName = meta?.name || product.name;
        const sharedDescription = meta?.description || product.description || product.name;
        const sharedBrand = meta?.brand || 'Store';
        const sharedUrl = meta?.link || product.link || imageUrl;
        
        for (let i = 0; i < meta.variants.length; i++) {
          const v = meta.variants[i];
          
          const variantRetailerId = v.contentId || `${baseRetailerId}_v${i + 1}`;
          
          const variantImageUrl = v.imageUrl?.startsWith('http')
            ? v.imageUrl
            : v.imageUrl
            ? `${process.env.UPLOAD_URL}${v.imageUrl}`
            : imageUrl;
          
          const payload: any = {
            retailer_id: variantRetailerId,
            item_group_id: baseRetailerId,
            
            // ✅ CRITICAL: Use IDENTICAL shared values
            name: sharedName,
            description: sharedDescription,
            brand: sharedBrand,
            url: sharedUrl,
            
            price: toCents(v.price ?? meta.price ?? product.price),
            sale_price: toCents(v.salePrice ?? meta.salePrice),
            
            currency: 'INR',
            availability: metaAvailability(
              v.isActive ?? meta.isActive ?? true,
              v.availability ?? meta.availability ?? true,
            ),
            
            condition: 'new',
            image_url: variantImageUrl,
          };
          
          // ✅ Add variant attributes
          if (v.size) payload.size = v.size;
          if (v.color) payload.color = v.color;
          if (v.pattern) payload.pattern = v.pattern;
          if (v.gender) payload.gender = v.gender;
          if (v.material) payload.material = v.material;
          if (v.ageGroup) payload.age_group = v.ageGroup;
          if (v.customAttribute) payload.additional_variant_attribute = v.customAttribute;
          
          console.log(`[Meta Update] Uploading variant ${i + 1}/${meta.variants.length}:`, variantRetailerId);
          const resp = await this.axiosInstance.post(
            `${this.apiUrl}/${this.catalogId}/products`,
            payload,
          );
          
          console.log(`[Meta Update] Variant uploaded:`, resp.data?.id);
          results.push({ retailer_id: variantRetailerId, metaId: resp.data?.id });
        }
        
        // Clear cache
        this.catalogCache = null;
        
        return { success: true, type: 'variants', metaProductId: results[0]?.metaId, results };
      }
      
      // ✅ No variants: upload single product
      const payload: any = {
        retailer_id: baseRetailerId,
        name: meta?.name || product.name,
        description: meta?.description || product.description || product.name,
        price: toCents(meta?.price ?? product.price),
        sale_price: toCents(meta?.salePrice ?? product.salePrice),
        currency: 'INR',
        availability: metaAvailability(meta?.isActive ?? product.isActive ?? true, meta?.availability ?? product.availability ?? true),
        condition: 'new',
        brand: 'Store',
        image_url: imageUrl,
        url: meta?.link || product.link || imageUrl,
      };
      
      console.log('[Meta Update] Creating updated product with retailer_id:', baseRetailerId);
      const response = await this.axiosInstance.post(
        `${this.apiUrl}/${this.catalogId}/products`,
        payload,
      );

      console.log('[Meta Update] Product updated successfully:', response.data.id);
      
      // Clear cache after update
      this.catalogCache = null;
      
      return { success: true, data: response.data, metaProductId: response.data.id };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorDetails = error.response?.data;
      
      console.error('[Meta Update Error]', {
        message: errorMsg,
        code: errorCode,
        status: error.response?.status,
        details: errorDetails,
        retailerId: baseRetailerId
      });
      
      // If duplicate retailer_id error, try to find and delete the existing one
      if (errorCode === 10800 || errorMsg.includes('Duplicate retailer_id')) {
        console.log('[Meta Update] Duplicate retailer_id detected, attempting cleanup...');
        try {
          await this.deleteProductByRetailerId(baseRetailerId);
          console.log('[Meta Update] Cleaned up duplicate, please try updating again');
        } catch (cleanupError) {
          console.error('[Meta Update] Cleanup failed:', cleanupError.message);
        }
      }
      
      throw new Error(errorMsg || 'Failed to update product in Meta Catalog');
    }
  }

  async deleteProductFromCatalog(metaProductId: string) {
    try {
      if (!this.catalogId || !this.accessToken) {
        throw new Error('Meta Catalog ID or Access Token not configured');
      }

      console.log('[Meta Delete] Deleting product with metaProductId:', metaProductId);

      // Meta API requires DELETE request to specific product endpoint
      const response = await this.axiosInstance.delete(
        `${this.apiUrl}/${metaProductId}`,
      );

      console.log('[Meta Delete] Product deleted successfully:', metaProductId);
      
      // Clear cache after deletion
      this.catalogCache = null;
      
      return { success: true, metaProductId };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.status;
      
      console.error('[Meta Delete Error]', {
        status: errorCode,
        message: errorMsg,
        metaProductId: metaProductId
      });
      
      // If product not found (404), consider it already deleted
      if (errorCode === 404) {
        console.log('[Meta Delete] Product not found in catalog, considering as deleted');
        return { success: true, metaProductId, note: 'Product not found in catalog' };
      }
      
      throw new Error(errorMsg || 'Failed to delete product from Meta Catalog');
    }
  }

  async deleteProductByRetailerId(retailerId: string) {
    try {
      if (!this.catalogId || !this.accessToken) {
        throw new Error('Meta Catalog ID or Access Token not configured');
      }

      console.log('[Meta Delete] Deleting product by retailer_id:', retailerId);

      // First, find the product by retailer_id
      const products = await axios.get(
        `${this.apiUrl}/${this.catalogId}/products?fields=id,retailer_id`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
          timeout: 30000,
        }
      );

      const product = products.data.data.find(p => p.retailer_id === retailerId);
      
      if (!product) {
        console.log('[Meta Delete] Product not found with retailer_id:', retailerId);
        return { success: true, retailerId, note: 'Product not found' };
      }

      // Delete using the Meta product ID
      await this.axiosInstance.delete(
        `${this.apiUrl}/${product.id}`,
      );

      console.log('[Meta Delete] Product deleted successfully by retailer_id:', retailerId);
      
      // Clear cache after deletion
      this.catalogCache = null;
      
      return { success: true, retailerId, metaProductId: product.id };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.error('[Meta Delete Error]', errorMsg);
      throw new Error(errorMsg || 'Failed to delete product from Meta Catalog');
    }
  }

  async syncVariantToCatalog(variant: any, parentProduct: any, parentRetailerId: string, meta?: any) {
    try {
      if (!this.catalogId || !this.accessToken) {
        throw new Error('Meta Catalog ID or Access Token not configured');
      }

      console.log('[Meta Sync Variant] Starting sync for variant:', variant.id, 'parent:', parentRetailerId);

      // Use variant image if available, otherwise use parent product image
      const imageUrl = variant.imageUrl?.startsWith('http')
        ? variant.imageUrl
        : parentProduct.imageUrl?.startsWith('http')
        ? parentProduct.imageUrl
        : `${process.env.UPLOAD_URL}${variant.imageUrl || parentProduct.imageUrl}`;

      const toCents = (val: any) => {
        const n = typeof val === 'string' ? parseFloat(val) : val;
        if (n === undefined || n === null || Number.isNaN(n)) return undefined;
        return Math.round(n * 100);
      };

      const metaAvailability = (isActive: boolean, availability: boolean) => {
        if (!isActive) return 'out of stock';
        return availability ? 'in stock' : 'out of stock';
      };

      // Variant retailer_id
      const variantRetailerId = variant.contentId || `${parentRetailerId}_v${variant.id}`;

      // ✅ CRITICAL: Use IDENTICAL values for all variants
      const sharedName = meta?.name || parentProduct.name;
      const sharedDescription = meta?.description || parentProduct.description || parentProduct.name;
      const sharedBrand = meta?.brand || 'Store';
      const sharedUrl = meta?.link || parentProduct.link || imageUrl;
      
      const payload: any = {
        retailer_id: variantRetailerId,
        item_group_id: parentRetailerId,
        
        // ✅ CRITICAL: Use IDENTICAL shared values
        name: sharedName,
        description: sharedDescription,
        brand: sharedBrand,
        url: sharedUrl,
        
        price: toCents(meta?.price ?? variant.price),
        sale_price: toCents(meta?.salePrice ?? variant.salePrice),
        
        currency: 'INR',
        availability: metaAvailability(
          meta?.isActive ?? variant.isActive ?? true,
          meta?.availability ?? variant.availability ?? true
        ),
        
        condition: 'new',
        image_url: imageUrl,
      };
      
      // ✅ Add variant attributes (REQUIRED by Meta)
      if (variant.size || meta?.size) payload.size = variant.size || meta.size;
      if (variant.color || meta?.color) payload.color = variant.color || meta.color;
      if (variant.pattern || meta?.pattern) payload.pattern = variant.pattern || meta.pattern;
      if (variant.gender || meta?.gender) payload.gender = variant.gender || meta.gender;
      if (variant.material || meta?.material) payload.material = variant.material || meta.material;
      if (variant.ageGroup || meta?.ageGroup) payload.age_group = variant.ageGroup || meta.ageGroup;
      
      // For custom variant attributes
      if (variant.customAttribute || meta?.customAttribute) {
        payload.additional_variant_attribute = variant.customAttribute || meta.customAttribute;
      }

      console.log('[Meta Sync Variant] Uploading variant with item_group_id:', parentRetailerId, `(${payload.size || ''} ${payload.color || ''})`.trim());
      const response = await this.axiosInstance.post(
        `${this.apiUrl}/${this.catalogId}/products`,
        payload,
      );

      console.log('[Meta Sync Variant] Variant uploaded successfully:', response.data.id);
      
      // Clear cache
      this.catalogCache = null;
      
      return { 
        success: true, 
        metaProductId: response.data.id, 
        retailerId: variantRetailerId,
        size: payload.size,
        color: payload.color
      };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.error('[Meta Sync Variant Error]', errorMsg);
      throw new Error(errorMsg || 'Failed to sync variant to Meta Catalog');
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
      const createdProducts: any[] = [];
      const updatedProducts: any[] = [];
      const skippedProducts: any[] = [];
      const existingProducts = await this.ecommerceService.getProducts(undefined, userId);

      console.log('[Meta Sync] Fetched', metaProducts.length, 'products from Meta Catalog');

      for (const metaProduct of metaProducts) {
        // Check if this product already exists in our database by metaProductId
        const existingProduct = existingProducts.find(p => p.metaProductId === metaProduct.id);
        
        // Skip products that have retailer_id starting with 'product_' (our uploaded products)
        if (metaProduct.retailer_id?.startsWith('product_')) {
          const productIdFromRetailerId = parseInt(metaProduct.retailer_id.replace('product_', ''));
          const uploadedProduct = existingProducts.find(p => p.id === productIdFromRetailerId);
          
          if (uploadedProduct) {
            console.log(`[Meta Sync] Skipping uploaded product: ${metaProduct.name} (retailer_id: ${metaProduct.retailer_id})`);
            skippedProducts.push({ name: metaProduct.name, retailer_id: metaProduct.retailer_id, reason: 'Already uploaded from system' });
            continue;
          }
        }
        
        // If product already exists with same metaProductId, skip it (already synced)
        if (existingProduct) {
          console.log(`[Meta Sync] Product already synced: ${metaProduct.name} (metaProductId: ${metaProduct.id})`);
          skippedProducts.push({ name: metaProduct.name, metaProductId: metaProduct.id, reason: 'Already synced' });
          continue;
        }
        
        console.log(`[Meta Sync] Processing new Meta product: ${metaProduct.name}`);
        
        let price = 0;
        if (typeof metaProduct.price === 'string') {
          const cleanPrice = metaProduct.price.replace(/[₹,]/g, '').trim();
          price = parseFloat(cleanPrice);
        } else if (typeof metaProduct.price === 'number') {
          price = metaProduct.price / 100;
        }
        
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

        const newProduct = await this.ecommerceService.createProduct(productData, userId);
        createdProducts.push({ ...newProduct, action: 'created' });
        console.log(`[Meta Sync] Created new product: ${newProduct.name} (ID: ${newProduct.id})`);
      }

      const summary = {
        success: true,
        total: metaProducts.length,
        created: createdProducts.length,
        skipped: skippedProducts.length,
        message: createdProducts.length > 0 
          ? `✅ Synced ${createdProducts.length} new product(s) from Meta Catalog!`
          : '✅ All products are already synced. No new products found.',
        products: createdProducts,
        skippedDetails: skippedProducts
      };
      
      console.log('[Meta Sync] Summary:', summary);
      return summary;
    } catch (error) {
      console.error('[Meta Sync] Error:', error.message);
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

  async handleOrderMessage(phone: string, phoneNumberId: string, order: any, userId: number, profileName?: string) {
    const productItems = order.product_items || [];
    
    const cartProducts: any[] = [];
    let totalAmount = 0;
    
    // Optimize: Only fetch products we need, not all products
    const catalogItemIds = productItems.map(item => item.catalog_item_id || item.product_retailer_id);
    const productIds = catalogItemIds
      .filter(id => id?.startsWith('product_'))
      .map(id => parseInt(id.replace('product_', '')));
    
    // Fetch only needed products
    const allProducts = productIds.length > 0 
      ? await this.ecommerceService.getProducts(undefined, userId)
      : [];
    
    for (const item of productItems) {
      const catalogItemId = item.catalog_item_id || item.product_retailer_id;
      const quantity = item.quantity || 1;
      
      let product;
      
      if (catalogItemId?.startsWith('product_')) {
        const prodId = parseInt(catalogItemId.replace('product_', ''));
        product = allProducts.find(p => p.id === prodId);
      }
      
      if (!product) {
        product = allProducts.find(p => p.metaProductId === catalogItemId || p.contentId === catalogItemId);
      }
      
      if (product) {
        const effectivePrice = product.salePrice || product.price;
        cartProducts.push({ ...product, quantity, effectivePrice });
        totalAmount += effectivePrice * quantity;
      }
    }
    
    // Create pending order immediately when customer triggers shop
    const orderItems = cartProducts.map(cartItem => ({
      productId: cartItem.id,
      quantity: cartItem.quantity || 1,
      price: cartItem.effectivePrice || cartItem.salePrice || cartItem.price
    }));
    
    await this.ecommerceService.createOrder({
      customerName: profileName || phone,
      customerPhone: phone,
      totalAmount: totalAmount,
      paymentMethod: 'pending',
      paymentStatus: 'pending',
      status: 'pending',
      items: orderItems
    }, userId);
    
    // Save cart and check customer in parallel
    const [, existingCustomer] = await Promise.all([
      this.sessionService.setSession(phone, { 
        cartProducts,
        totalAmount,
        step: 'awaiting_flow_response'
      }, userId),
      this.ecommerceService.getCustomerByPhone(phone, userId)
    ]);
    
    if (existingCustomer) {
      await this.sendCustomerDetailsConfirmation(phone, phoneNumberId, existingCustomer, userId);
    } else {
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
      // Check for button clicks even without step (for expired sessions)
      const isConfirmDetailsButton = 
        message === 'Use My Details' || 
        message === 'Update Details' || 
        message === 'Order for Someone' ||
        message.toLowerCase() === 'confirm' ||
        message.toLowerCase() === 'update' ||
        message.toLowerCase() === 'update details' ||
        message.toLowerCase() === 'someone_else' ||
        message.toLowerCase() === 'order for someone';
      
      const isPaymentMethodButton = 
        message === 'Pay Online' ||
        message === 'Cash on Delivery' ||
        message.toLowerCase() === 'payment_razorpay' ||
        message.toLowerCase() === 'payment_cod' ||
        message.toLowerCase() === 'pay online' ||
        message.toLowerCase() === 'cash on delivery';
      
      const step = await this.sessionService.getStep(phone, userId);
      
      // If button clicked but no step, show session expired
      if ((isConfirmDetailsButton || isPaymentMethodButton) && !step) {
        await this.sessionService.clearSession(phone, userId);
        await this.sendTextMessage(phone, phoneNumberId, '⏱️ Session expired. Please send *shop* again to start a new order.');
        return true;
      }
      
      if (!step) return false;
      
      // Check for EXIT command
      if (message.toUpperCase() === 'EXIT') {
        await this.sessionService.clearSession(phone, userId);
        await this.sendTextMessage(phone, phoneNumberId, '❌ Order cancelled. Type SHOP to browse products again.');
        return true;
      }
      
      if (step === 'confirm_details') {
        const response = message.toLowerCase();
        const currentSession = await this.sessionService.getSession(phone, userId);
        
        // Check if cart exists - if not, show session expired message
        if (!currentSession?.cartProducts || currentSession.cartProducts.length === 0) {
          await this.sessionService.clearSession(phone, userId);
          await this.sendTextMessage(phone, phoneNumberId, '⏱️ Session expired. Please send *shop* again to start a new order.');
          return true;
        }
        
        if (response === 'confirm' || response === 'use my details' || message === 'Use My Details') {
          await this.sendPaymentMethodSelection(phone, phoneNumberId, userId);
          return true;
        } else if (response === 'update' || response === 'update details' || message === 'Update Details') {
          // Clear existing details but preserve cart data
          await this.sessionService.setSession(phone, { 
            customerName: undefined,
            customerAddress: undefined,
            customerCity: undefined,
            customerState: undefined,
            customerPincode: undefined,
            cartProducts: currentSession?.cartProducts,
            totalAmount: currentSession?.totalAmount,
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
          // Clear existing details but preserve cart data for new recipient
          await this.sessionService.setSession(phone, { 
            customerName: undefined,
            customerAddress: undefined,
            customerCity: undefined,
            customerState: undefined,
            customerPincode: undefined,
            cartProducts: currentSession?.cartProducts,
            totalAmount: currentSession?.totalAmount,
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
        return false; // Unknown button, don't handle it
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
        
        // Check if user already selected a payment method
        const session = await this.sessionService.getSession(phone, userId);
        const previousPaymentMethod = session?.paymentMethod;
        
        if (previousPaymentMethod && previousPaymentMethod !== paymentMethod) {
          await this.sessionService.clearSession(phone, userId);
          await this.sendTextMessage(phone, phoneNumberId, '⏱️ Session expired. Please send *shop* again to start a new order.');
          return true;
        }
        
        await this.sessionService.setPaymentMethod(phone, paymentMethod, userId);
        
        const cartProducts = session?.cartProducts || [];
        const totalAmount = session?.totalAmount || 0;
        
        if (cartProducts.length > 0 && session) {
          // State code mapping for shipping - handle both formats
          const stateCodeMap = {
            "AN": "ANDAMAN_AND_NICOBAR_ISLANDS",
            "AP": "ANDHRA_PRADESH",
            "AR": "ARUNACHAL_PRADESH",
            "AS": "ASSAM",
            "BR": "BIHAR",
            "CH": "CHANDIGARH",
            "CT": "CHHATTISGARH",
            "DN": "DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU",
            "DL": "DELHI",
            "GA": "GOA",
            "GJ": "GUJARAT",
            "HR": "HARYANA",
            "HP": "HIMACHAL_PRADESH",
            "JK": "JAMMU_AND_KASHMIR",
            "JH": "JHARKHAND",
            "KA": "KARNATAKA",
            "KL": "KERALA",
            "LA": "LADAKH",
            "LD": "LAKSHADWEEP",
            "MP": "MADHYA_PRADESH",
            "MH": "MAHARASHTRA",
            "MN": "MANIPUR",
            "ML": "MEGHALAYA",
            "MZ": "MIZORAM",
            "NL": "NAGALAND",
            "OR": "ODISHA",
            "PY": "PUDUCHERRY",
            "PB": "PUNJAB",
            "RJ": "RAJASTHAN",
            "SK": "SIKKIM",
            "TN": "TAMIL_NADU",
            "TG": "TELANGANA",
            "TR": "TRIPURA",
            "UP": "UTTAR_PRADESH",
            "UT": "UTTARAKHAND",
            "WB": "WEST_BENGAL",
            // Full names mapping
            "Tamil Nadu": "TAMIL_NADU",
            "Andhra Pradesh": "ANDHRA_PRADESH",
            "Karnataka": "KARNATAKA",
            "Kerala": "KERALA",
            "Maharashtra": "MAHARASHTRA",
            "Gujarat": "GUJARAT",
            "Rajasthan": "RAJASTHAN",
            "Delhi": "DELHI",
            "West Bengal": "WEST_BENGAL",
            "Uttar Pradesh": "UTTAR_PRADESH",
            "Madhya Pradesh": "MADHYA_PRADESH",
            "Bihar": "BIHAR",
            "Telangana": "TELANGANA",
            "Haryana": "HARYANA",
            "Punjab": "PUNJAB",
            "Odisha": "ODISHA",
            "Assam": "ASSAM",
            "Jharkhand": "JHARKHAND",
            "Chhattisgarh": "CHHATTISGARH",
            "Uttarakhand": "UTTARAKHAND",
            "Himachal Pradesh": "HIMACHAL_PRADESH",
            "Goa": "GOA",
            "Jammu and Kashmir": "JAMMU_AND_KASHMIR",
            "Chandigarh": "CHANDIGARH"
          };
          
          const stateCode = session.customerState ? (stateCodeMap[session.customerState] || session.customerState.toUpperCase().replace(/ /g, '_')) : '';
          
          // Get shipping charge and create order in parallel
          const [shippingRate] = await Promise.all([
            this.ecommerceService.getShippingRateByState(stateCode, userId)
          ]);
          
          const shippingCharge = shippingRate?.flatShippingRate || 0;
          const finalTotal = totalAmount + shippingCharge;
          
          // Create order items
          const orderItems = cartProducts.map(cartItem => ({
            productId: cartItem.productId || cartItem.id,
            quantity: cartItem.quantity || 1,
            price: cartItem.effectivePrice || cartItem.salePrice || cartItem.price
          }));
          
          // Create order
          const order = await this.ecommerceService.createOrder({
            customerName: session.customerName,
            customerPhone: phone,
            customerAddress: session.customerAddress,
            customerCity: session.customerCity,
            customerState: stateCode,
            customerPincode: session.customerPincode,
            totalAmount: finalTotal,
            shippingAmount: shippingCharge,
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'cod' ? 'cod' : 'pending',
            status: paymentMethod === 'cod' ? 'placed' : 'pending',
            items: orderItems
          }, userId);
          
          if (paymentMethod === 'razorpay') {
            try {
              const items = cartProducts.map(p => ({
                name: p.name,
                price: p.effectivePrice || p.salePrice || p.price,
                quantity: p.quantity
              }));
              
              await this.razorpayService.sendPaymentRequestMultiple(
                phone,
                phoneNumberId,
                finalTotal,
                order.id,
                items,
                shippingCharge
              );
            } catch (error) {
              console.error('Payment link error:', error);
              const productList = cartProducts.map(p => `${p.name} x${p.quantity}`).join('\n');
              await this.sendTextMessage(phone, phoneNumberId, `✅ *Order Placed*\n\n${productList}\nSubtotal: ₹${totalAmount}\nShipping: ₹${shippingCharge}\nTotal: ₹${finalTotal}\n\nOur team will send you payment link shortly 📞`);
            }
          } else {
            const formatStateName = (state: string) => {
              if (!state) return '';
              return state
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            };
            
            const productList = cartProducts.map(p => `${p.name} (x${p.quantity}) - ₹${(p.effectivePrice || p.salePrice || p.price) * p.quantity}`).join('\n');
            const confirmationMessage = `✅ *Order Confirmed*\n\n${productList}\n\nSubtotal: ₹${totalAmount}\nShipping: ₹${shippingCharge}\n*Total: ₹${finalTotal}*\n\nPayment: Cash on Delivery\n\n*Delivery Details:*\nName: ${session.customerName}\nAddress: ${session.customerAddress}\nCity: ${session.customerCity}\nState: ${formatStateName(stateCode)}\nPincode: ${session.customerPincode}\n\nOur team will contact you soon 😊`;
            await this.sendTextMessage(phone, phoneNumberId, confirmationMessage);
          }
          
          await this.sessionService.clearSession(phone, userId);
          return true;
        } else {
          await this.sendTextMessage(phone, phoneNumberId, '❌ Session expired. Please start shopping again.');
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
          timeout: 15000, // Reduced from 30s to 15s
        }
      );
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
      
      // Get existing session to preserve cart data
      const existingSession = await this.sessionService.getSession(phone, userId);
      
      // Update step while preserving cart data
      await this.sessionService.setSession(phone, { 
        step: 'awaiting_payment_method',
        cartProducts: existingSession?.cartProducts, // Preserve cart
        totalAmount: existingSession?.totalAmount    // Preserve total
      }, userId);
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
      
      // Convert state from TAMIL_NADU to Tamil Nadu
      const formatStateName = (state: string) => {
        if (!state) return '';
        return state
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };
      
      const displayState = formatStateName(state);
      
      // Build full address
      let address = customer.customerAddress || 'Not provided';
      if (address !== 'Not provided') {
        const addressParts = [customer.customerAddress, city, displayState, pincode].filter(p => p && p !== 'undefined');
        address = addressParts.join(', ');
      }
      
      // Get existing session to preserve cart data
      const existingSession = await this.sessionService.getSession(phone, userId);
      
      // Save customer details to session for later use, preserving cart data
      await this.sessionService.setSession(phone, {
        customerName: customer.customerName,
        customerAddress: customer.customerAddress,
        customerCity: customer.customerCity,
        customerState: customer.customerState,
        customerPincode: customer.customerPincode,
        cartProducts: existingSession?.cartProducts, // Preserve cart
        totalAmount: existingSession?.totalAmount,   // Preserve total
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
        "AN": "ANDAMAN_AND_NICOBAR_ISLANDS",
        "AP": "ANDHRA_PRADESH",
        "AR": "ARUNACHAL_PRADESH",
        "AS": "ASSAM",
        "BR": "BIHAR",
        "CH": "CHANDIGARH",
        "CT": "CHHATTISGARH",
        "DN": "DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU",
        "DL": "DELHI",
        "GA": "GOA",
        "GJ": "GUJARAT",
        "HR": "HARYANA",
        "HP": "HIMACHAL_PRADESH",
        "JK": "JAMMU_AND_KASHMIR",
        "JH": "JHARKHAND",
        "KA": "KARNATAKA",
        "KL": "KERALA",
        "LA": "LADAKH",
        "LD": "LAKSHADWEEP",
        "MP": "MADHYA_PRADESH",
        "MH": "MAHARASHTRA",
        "MN": "MANIPUR",
        "ML": "MEGHALAYA",
        "MZ": "MIZORAM",
        "NL": "NAGALAND",
        "OR": "ODISHA",
        "PY": "PUDUCHERRY",
        "PB": "PUNJAB",
        "RJ": "RAJASTHAN",
        "SK": "SIKKIM",
        "TN": "TAMIL_NADU",
        "TG": "TELANGANA",
        "TR": "TRIPURA",
        "UP": "UTTAR_PRADESH",
        "UT": "UTTARAKHAND",
        "WB": "WEST_BENGAL"
      };
      
      const stateCode = stateMap[customerData.customerState] || customerData.customerState;
      
      // Get shipping charge and create order
      const shippingRate = await this.ecommerceService.getShippingRateByState(stateCode, userId);
      const shippingCharge = shippingRate?.flatShippingRate || 0;
      const finalTotal = totalAmount + shippingCharge;
      
      // Create order items
      const orderItems = cartProducts.map(cartItem => ({
        productId: cartItem.productId || cartItem.id,
        quantity: cartItem.quantity || 1,
        price: cartItem.effectivePrice || cartItem.salePrice || cartItem.price
      }));
      
      // Create order with shipping charge
      const order = await this.ecommerceService.createOrder({
        customerName: customerData.customerName,
        customerPhone: phone,
        customerAddress: customerData.customerAddress,
        customerCity: customerData.customerCity,
        customerState: stateCode,
        customerPincode: customerData.customerPincode,
        totalAmount: finalTotal,
        shippingAmount: shippingCharge,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'cod' : 'pending',
        status: paymentMethod === 'cod' ? 'placed' : 'pending',
        items: orderItems
      }, userId);
      
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
            finalTotal,
            order.id,
            items,
            shippingCharge
          );
        } catch (error) {
          console.error('Payment link error:', error);
          const productList = cartProducts.map(p => `${p.name} x${p.quantity}`).join('\n');
          await this.sendTextMessage(phone, phoneNumberId, `✅ *Order Placed*\n\n${productList}\nSubtotal: ₹${totalAmount}\nShipping: ₹${shippingCharge}\nTotal: ₹${finalTotal}\n\nOur team will send you payment link shortly 📞`);
        }
      } else {
        // COD confirmation with shipping details
        const formatStateName = (state: string) => {
          if (!state) return '';
          return state
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        };
        
        const productList = cartProducts.map(p => `${p.name} (x${p.quantity}) - ₹${(p.effectivePrice || p.salePrice || p.price) * p.quantity}`).join('\n');
        const confirmationMessage = `✅ *Order Confirmed*\n\n${productList}\n\nSubtotal: ₹${totalAmount}\nShipping: ₹${shippingCharge}\n*Total: ₹${finalTotal}*\n\nPayment: Cash on Delivery\n\n*Delivery Details:*\nName: ${customerData.customerName}\nAddress: ${customerData.customerAddress}\nCity: ${customerData.customerCity}\nState: ${formatStateName(stateCode)}\nPincode: ${customerData.customerPincode}\n\nOur team will contact you soon 😊`;
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
