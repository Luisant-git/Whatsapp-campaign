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
import { SessionGuard } from '../auth/session.guard';

@Controller('ecommerce')
@UseGuards(SessionGuard)
export class EcommerceController {
  constructor(private ecommerceService: EcommerceService) {}

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
      imageUrl: file ? `/uploads/${file.filename}` : null,
      subCategoryId: +body.subCategoryId,
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
      data.imageUrl = `/uploads/${file.filename}`;
    }
    return this.ecommerceService.updateProduct(+id, data);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.ecommerceService.deleteProduct(+id);
  }

  @Post('orders')
  createOrder(@Body() body: any) {
    return this.ecommerceService.createOrder(body);
  }

  @Get('orders')
  getOrders() {
    return this.ecommerceService.getOrders();
  }

  @Put('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.ecommerceService.updateOrderStatus(+id, body.status);
  }
}
