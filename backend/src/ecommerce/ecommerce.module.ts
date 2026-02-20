import { Module } from '@nestjs/common';
import { EcommerceController } from './ecommerce.controller';
import { EcommerceService } from './ecommerce.service';
import { WhatsappEcommerceService } from './whatsapp-ecommerce.service';
import { ShoppingSessionService } from './shopping-session.service';
import { MetaCatalogService } from './meta-catalog.service';
import { PrismaService } from '../prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  controllers: [EcommerceController],
  providers: [EcommerceService, WhatsappEcommerceService, ShoppingSessionService, MetaCatalogService, PrismaService, TenantPrismaService, CentralPrismaService],
  exports: [EcommerceService, WhatsappEcommerceService, MetaCatalogService],
})
export class EcommerceModule {}
