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
@UseGuards(SessionGuard)
export class EcommerceController {
  constructor(
    private ecommerceService: EcommerceService,
    private metaCatalogService: MetaCatalogService,
  ) {}

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
  async createProduct(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const data = {
      name: body.name,
      description: body.description,
      price: parseFloat(body.price),
      imageUrl: file ? `${process.env.UPLOAD_URL}/${file.filename}` : null,
      subCategoryId: +body.subCategoryId,
      link: body.link || null,
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
  async updateProduct(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const data: any = {
      name: body.name,
      description: body.description,
      price: parseFloat(body.price),
      subCategoryId: +body.subCategoryId,
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
  async syncProductToMeta(@Param('id') id: string) {
    const product = await this.ecommerceService.getProduct(+id);
    return this.metaCatalogService.syncProductToCatalog(product);
  }

  @Get('customers')
  getCustomers(@Request() req) {
    return this.ecommerceService.getCustomers(req.session.userId);
  }
}
