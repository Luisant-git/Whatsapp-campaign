import { Module } from '@nestjs/common';
import { EcommerceController } from './ecommerce.controller';
import { WebhookController } from './webhook.controller';
import { EcommerceService } from './ecommerce.service';
import { WhatsappEcommerceService } from './whatsapp-ecommerce.service';
import { ShoppingSessionService } from './shopping-session.service';
import { MetaCatalogService } from './meta-catalog.service';
import { RazorpayService } from './razorpay.service';
import { FlowMessageModule } from '../flow-message/flow-message.module';
import { CustomerDetailsFlowModule } from '../customer-details-flow/customer-details-flow.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [FlowMessageModule, CustomerDetailsFlowModule, NotificationModule],
  controllers: [EcommerceController, WebhookController],
  providers: [EcommerceService, WhatsappEcommerceService, ShoppingSessionService, MetaCatalogService, RazorpayService],
  exports: [EcommerceService, WhatsappEcommerceService, MetaCatalogService],
})
export class EcommerceModule {}
