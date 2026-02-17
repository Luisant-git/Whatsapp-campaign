import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { TenantPrismaService } from 'src/tenant-prisma.service';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService,TenantPrismaService],
})
export class CategoryModule {}
