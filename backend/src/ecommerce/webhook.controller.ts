import { Controller, Post, Body, Headers } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { EcommerceService } from './ecommerce.service';
import { MetaCatalogService } from './meta-catalog.service';

@Controller('webhooks')
export class WebhookController {
  constructor(
    private razorpayService: RazorpayService,
    private ecommerceService: EcommerceService,
    private metaCatalogService: MetaCatalogService,
  ) {}

  @Post('razorpay')
  async handleRazorpayWebhook(@Body() body: any, @Headers() headers: any) {
    console.log('Razorpay webhook received:', body);

    const event = body.event;
    const payload = body.payload?.payment?.entity || body.payload?.order?.entity;

    if (event === 'payment.captured' || event === 'order.paid') {
      const notes = payload.notes || {};
      const orderId = parseInt(notes.order_id);
      const userId = parseInt(notes.user_id);
      const referenceId = notes.reference_id;

      if (orderId) {
        await this.ecommerceService.updateOrderStatus(orderId, 'confirmed', userId);
        
        const order = await this.ecommerceService.getOrder(orderId, userId);
        if (order && referenceId) {
          const phoneNumberId = process.env.PHONE_NUMBER_ID || '';
          if (phoneNumberId) {
            await this.razorpayService.updateOrderStatus(
              order.customerPhone,
              phoneNumberId,
              referenceId,
              'completed'
            );
          }
        }
      }
    }

    return { status: 'ok' };
  }
}
