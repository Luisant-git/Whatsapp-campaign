import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SessionGuard } from '../auth/session.guard';
import { TenantContext } from '../tenant/tenant.decorator';
import type { TenantContext as TenantContextType } from '../tenant/tenant.decorator';

@Controller('category')
@UseGuards(SessionGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  /* -------------------- CREATE -------------------- */
  @Post()
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @TenantContext() ctx: TenantContextType,
  ) {
    return this.categoryService.create(createCategoryDto, ctx);
  }

  /* -------------------- GET ALL (Pagination + Search) -------------------- */
  
  @Get()
  findAll(@TenantContext() ctx: TenantContextType) {
    return this.categoryService.findAll(ctx);
  }
  
  /* -------------------- GET ONE -------------------- */
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @TenantContext() ctx: TenantContextType,
  ) {
    return this.categoryService.findOne(+id, ctx);
  }

  /* -------------------- UPDATE -------------------- */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @TenantContext() ctx: TenantContextType,
  ) {
    return this.categoryService.update(+id, updateCategoryDto, ctx);
  }

  /* -------------------- SOFT DELETE -------------------- */
  @Patch(':id/soft-delete')
  softDelete(
    @Param('id') id: string,
    @TenantContext() ctx: TenantContextType,
  ) {
    return this.categoryService.softDelete(+id, ctx);
  }
}
