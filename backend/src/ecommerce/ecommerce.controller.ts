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
  ) {}

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
  ) {
    const data = {
      name: body.name,
      description: body.description || '',
      price: parseFloat(body.price),
      salePrice: body.salePrice ? parseFloat(body.salePrice) : null,
      imageUrl: file ? `${process.env.UPLOAD_URL}/${file.filename}` : null,
      subCategoryId: +body.subCategoryId,
      link: body.link || null,
      contentId: body.contentId || null,
      availability:
        body.availability === 'true' || body.availability === true,
      isActive: body.isActive !== 'false' && body.isActive !== false,
    };
    return this.ecommerceService.createProduct(data);
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
) {
  const data: any = {
    name: body.name,
    description: body.description || '',
    price: parseFloat(body.price),
    salePrice: body.salePrice ? parseFloat(body.salePrice) : null,
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
  return this.ecommerceService.updateProduct(+id, data);
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
async syncProductToMeta(@Param('id') id: string, @Body() body: any) {
  const product = await this.ecommerceService.getProduct(+id);
  const result = await this.metaCatalogService.syncProductToCatalog(product, body);

  await this.ecommerceService.updateProduct(+id, {
    metaProductId: result.metaProductId,
    source: 'uploaded',
  });

  return result;
}

  @Post('sync-from-meta')
  async syncFromMeta(@Request() req) {
    return this.metaCatalogService.syncMetaProductsToDatabase(req.session.userId);
  }

  @Get('customers')
  getCustomers(@Request() req) {
    return this.ecommerceService.getCustomers(req.session.userId);
  }
}
