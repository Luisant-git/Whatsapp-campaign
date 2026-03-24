import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EcommerceService } from './ecommerce.service';
import { MetaCatalogService } from './meta-catalog.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('ecommerce')
export class EcommerceController {
  constructor(
    private ecommerceService: EcommerceService,
    private metaCatalogService: MetaCatalogService,
  ) { }

  @Get('payment-callback')
  async paymentCallback(@Query() query: any) {
    const { razorpay_payment_id, razorpay_payment_link_id } = query;
    const orderId = parseInt(query.order_id);
    const userId = parseInt(query.user_id);

    if (razorpay_payment_id && orderId) {
      await this.metaCatalogService.handlePaymentSuccess(orderId, razorpay_payment_id, userId);
      return '<html><body><h1>Payment Successful!</h1><p>Your order is confirmed. You will receive a WhatsApp message shortly.</p></body></html>';
    }
    return '<html><body><h1>Payment Failed</h1><p>Please try again.</p></body></html>';
  }

  @UseGuards(SessionGuard)
  @Post('categories')
  createCategory(@Body() body: { name: string }) {
    return this.ecommerceService.createCategory(body.name);
  }

  @Get('categories')
  getCategories() {
    return this.ecommerceService.getCategories();
  }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: { name: string }) {
    return this.ecommerceService.updateCategory(+id, body.name);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.ecommerceService.deleteCategory(+id);
  }

  @Post('subcategories')
  createSubCategory(@Body() body: { name: string; categoryId: number }) {
    return this.ecommerceService.createSubCategory(body.name, body.categoryId);
  }

  @Get('subcategories')
  getSubCategories(@Query('categoryId') categoryId?: string) {
    return this.ecommerceService.getSubCategories(categoryId ? +categoryId : undefined);
  }

  @Put('subcategories/:id')
  updateSubCategory(@Param('id') id: string, @Body() body: { name?: string; categoryId?: number }) {
    return this.ecommerceService.updateSubCategory(+id, body);
  }

  @Delete('subcategories/:id')
  deleteSubCategory(@Param('id') id: string) {
    return this.ecommerceService.deleteSubCategory(+id);
  }

  @Post('products')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const name = `product-${Date.now()}${extname(file.originalname)}`;
          cb(null, name);
        },
      }),
    }),
  )
  async createProduct(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req,
  ) {
    const data = {
      name: body.name,
      description: body.description || '',
      price: parseFloat(body.price),
      salePrice: body.salePrice ? parseFloat(body.salePrice) : null,
      stock: body.stock ? parseInt(body.stock) : 0,
      imageUrl: file ? `${process.env.UPLOAD_URL}/${file.filename}` : null,
      subCategoryId: +body.subCategoryId,
      link: body.link || null,
      contentId: body.contentId || null,
      availability:
        body.availability === 'true' || body.availability === true,
      isActive: body.isActive !== 'false' && body.isActive !== false,
    };
    return this.ecommerceService.createProduct(data, req.session?.userId);
  }

  @Get('products')
  getProducts(@Query('subCategoryId') subCategoryId?: string) {
    return this.ecommerceService.getProducts(subCategoryId ? +subCategoryId : undefined);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.ecommerceService.getProduct(+id);
  }

  @Put('products/:id')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const name = `product-${Date.now()}${extname(file.originalname)}`;
          cb(null, name);
        },
      }),
    }),
  )
  async updateProduct(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req,
  ) {
    const data: any = {
      name: body.name,
      description: body.description || '',
      price: parseFloat(body.price),
      salePrice: body.salePrice ? parseFloat(body.salePrice) : null,
      stock: body.stock !== undefined ? parseInt(body.stock) : undefined,
      subCategoryId: +body.subCategoryId,
      link: body.link || null,
      contentId: body.contentId || null,
      availability:
        body.availability === 'true' || body.availability === true,
      isActive: body.isActive === 'true' || body.isActive === true,
    };
    if (file) {
      data.imageUrl = `${process.env.UPLOAD_URL}/${file.filename}`;
    }
    return this.ecommerceService.updateProduct(+id, data, req.session?.userId);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.ecommerceService.deleteProduct(+id);
  }

  // Add these to ecommerce.controller.ts

  // ==================== VARIANT ENDPOINTS ====================

  @Post('products/:productId/variants')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const name = `variant-${Date.now()}${extname(file.originalname)}`;
          cb(null, name);
        },
      }),
    }),
  )
  async createVariant(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const data = {
      productId: +productId,
      name: body.name,
      description: body.description || null,
      price: parseFloat(body.price),
      salePrice: body.salePrice ? parseFloat(body.salePrice) : null,
      stock: body.stock ? parseInt(body.stock) : 0,
      imageUrl: file ? `${process.env.UPLOAD_URL}/${file.filename}` : null,
      link: body.link || null,
      contentId: body.contentId || null,
      availability: body.availability === 'true' || body.availability === true,
      isActive: body.isActive !== 'false' && body.isActive !== false,
    };
    return this.ecommerceService.createVariant(data);
  }

  @Get('products/:productId/variants')
  getVariants(@Param('productId') productId: string) {
    return this.ecommerceService.getVariants(+productId);
  }

  @Put('variants/:id')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const name = `variant-${Date.now()}${extname(file.originalname)}`;
          cb(null, name);
        },
      }),
    }),
  )
  async updateVariant(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const data: any = {
      name: body.name,
      description: body.description || null,
      price: parseFloat(body.price),
      salePrice: body.salePrice ? parseFloat(body.salePrice) : null,
      stock: body.stock !== undefined ? parseInt(body.stock) : undefined,
      link: body.link || null,
      contentId: body.contentId || null,
      availability: body.availability === 'true' || body.availability === true,
      isActive: body.isActive !== 'false' && body.isActive !== false,
    };
    if (file) {
      data.imageUrl = `${process.env.UPLOAD_URL}/${file.filename}`;
    }
    return this.ecommerceService.updateVariant(+id, data);
  }

  @Delete('variants/:id')
  deleteVariant(@Param('id') id: string) {
    return this.ecommerceService.deleteVariant(+id);
  }

  @Post('orders')
  createOrder(@Body() body: any, @Request() req) {
    return this.ecommerceService.createOrder(body, req.session.userId);
  }

  @Get('orders')
  getOrders(@Request() req) {
    return this.ecommerceService.getOrders(req.session.userId);
  }

  @Put('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() body: { status: string }, @Request() req) {
    return this.ecommerceService.updateOrderStatus(+id, body.status, req.session.userId);
  }

  @Post('products/:id/sync-meta')
  syncProductToMeta(@Param('id') id: string, @Body() body: any, @Request() req) {
    try {
      console.log(`[Meta Sync] === ENDPOINT HIT ===`);
      console.log(`[Meta Sync] Product ID: ${id}`);
      console.log(`[Meta Sync] Session:`, {
        userId: req.session?.userId,
        tenantId: req.session?.tenantId,
        userType: req.session?.userType
      });

      const userId = req.session?.userId;
      const tenantId = req.session?.tenantId;
      const productId = +id;

      if (!tenantId) {
        console.error('[Meta Sync] No tenantId in session!');
        return {
          success: false,
          error: 'No tenant context. Please login again.',
          productId: productId
        };
      }

      console.log(`[Meta Sync] Spawning background sync for product ${productId}`);

      // Immediately spawn background process without awaiting
      setTimeout(() => {
        this.performMetaSync(productId, body, tenantId).catch(err => {
          console.error(`[Meta Sync] Failed for product ${productId}:`, err.message);
        });
      }, 0);

      console.log(`[Meta Sync] Returning immediate response for product ${productId}`);

      // Return immediately - synchronously
      return { 
        success: true, 
        message: 'Product sync queued. Check backend logs for status.',
        productId: productId 
      };
    } catch (error) {
      console.error('[Meta Sync] Error in sync endpoint:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        productId: +id
      };
    }
  }

  private async performMetaSync(productId: number, body: any, tenantId: number) {
    try {
      console.log(`[Meta Sync] Starting background sync for product ${productId}, tenant ${tenantId}`);
      
      const product = await this.ecommerceService.getProduct(productId, tenantId);
      
      if (!product) {
        console.error(`[Meta Sync] Product ${productId} not found`);
        return;
      }

      const result = await this.metaCatalogService.syncProductToCatalog(product, body);
      
      await this.ecommerceService.updateProduct(productId, {
        metaProductId: result.metaProductId,
        source: 'uploaded',
      }, tenantId);
      
      console.log(`[Meta Sync] Product ${productId} synced successfully:`, result.metaProductId);
    } catch (error) {
      console.error(`[Meta Sync] Product ${productId} sync error:`, error.message);
      throw error;
    }
  }

  @Post('variants/:id/sync-meta')
  syncVariantToMeta(@Param('id') id: string, @Body() body: any, @Request() req) {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return { success: false, error: 'No tenant context' };
      }

      setTimeout(() => {
        this.performVariantMetaSync(+id, body, tenantId).catch(err => {
          console.error(`[Meta Sync] Variant ${id} sync failed:`, err.message);
        });
      }, 0);

      return { success: true, message: 'Variant sync queued', variantId: +id };
    } catch (error) {
      return { success: false, error: error.message, variantId: +id };
    }
  }

  private async performVariantMetaSync(variantId: number, body: any, tenantId: number) {
    try {
      const variant = await this.ecommerceService.getVariant(variantId);
      if (!variant) {
        console.error(`[Meta Sync] Variant ${variantId} not found`);
        return;
      }

      const product = await this.ecommerceService.getProduct(variant.productId, tenantId);
      if (!product) {
        console.error(`[Meta Sync] Product ${variant.productId} not found`);
        return;
      }

      const result = await this.metaCatalogService.syncProductToCatalog(product, {
        ...body,
        variants: [variant]
      });

      await this.ecommerceService.updateVariant(variantId, {
        metaProductId: result.results?.[0]?.metaId,
      });

      console.log(`[Meta Sync] Variant ${variantId} synced:`, result.results?.[0]?.metaId);
    } catch (error) {
      console.error(`[Meta Sync] Variant ${variantId} error:`, error.message);
      throw error;
    }
  }

  @UseGuards(SessionGuard)
  @Get('products/:id/sync-status')
  async getSyncStatus(@Param('id') id: string) {
    const product = await this.ecommerceService.getProduct(+id);
    return {
      productId: +id,
      synced: !!product?.metaProductId,
      metaProductId: product?.metaProductId,
      source: product?.source,
    };
  }

  @Post('sync-from-meta')
  async syncFromMeta(@Request() req) {
    return this.metaCatalogService.syncMetaProductsToDatabase(req.session.userId);
  }

  @Get('customers')
  getCustomers(@Request() req) {
    return this.ecommerceService.getCustomers(req.session.userId);
  }

  // ==================== SHIPPING RATE ENDPOINTS ====================

  @Post('shipping-rates')
  createShippingRate(@Body() body: { state: string; flatShippingRate: number }) {
    return this.ecommerceService.createShippingRate(body.state, body.flatShippingRate);
  }

  @Get('shipping-rates')
  getShippingRates() {
    return this.ecommerceService.getShippingRates();
  }

  @Get('shipping-rates/:state')
  getShippingRateByState(@Param('state') state: string) {
    return this.ecommerceService.getShippingRateByState(state);
  }

  @Put('shipping-rates/:id')
  updateShippingRate(
    @Param('id') id: string,
    @Body() body: { state?: string; flatShippingRate?: number },
  ) {
    return this.ecommerceService.updateShippingRate(+id, body);
  }

  @Delete('shipping-rates/:id')
  deleteShippingRate(@Param('id') id: string) {
    return this.ecommerceService.deleteShippingRate(+id);
  }
}
