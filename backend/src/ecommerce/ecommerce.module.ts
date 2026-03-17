import { Module } from '@nestjs/common';
import { EcommerceController } from './ecommerce.controller';
import { WebhookController } from './webhook.controller';
import { EcommerceService } from './ecommerce.service';
import { WhatsappEcommerceService } from './whatsapp-ecommerce.service';
import { ShoppingSessionService } from './shopping-session.service';
import { MetaCatalogService } from './meta-catalog.service';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from '../prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { FlowMessageModule } from '../flow-message/flow-message.module';
import { CustomerDetailsFlowModule } from '../customer-details-flow/customer-details-flow.module';

@Module({
  imports: [FlowMessageModule, CustomerDetailsFlowModule],
  controllers: [EcommerceController, WebhookController],
  providers: [EcommerceService, WhatsappEcommerceService, ShoppingSessionService, MetaCatalogService, RazorpayService, PrismaService, TenantPrismaService, CentralPrismaService],
  exports: [EcommerceService, WhatsappEcommerceService, MetaCatalogService],
})
export class EcommerceModule {}
