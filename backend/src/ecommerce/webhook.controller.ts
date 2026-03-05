import { Controller, Post, Body, Headers, Param } from '@nestjs/common';
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
            
            await this.razorpayService.sendOrderConfirmation(
              order.customerPhone,
              phoneNumberId,
              order
            );
          }
        }
      }
    }

    return { status: 'ok' };
  }

  @Post('payment-success/:orderId')
  async manualPaymentConfirm(@Param('orderId') orderId: string) {
    try {
      const order = await this.ecommerceService.getOrderById(parseInt(orderId));
      
      if (order) {
        await this.ecommerceService.updateOrderStatus(parseInt(orderId), 'confirmed', undefined);
      
        const phoneNumberId = process.env.PHONE_NUMBER_ID || '';
        if (phoneNumberId) {
          const productList = `${order.product.name} (x${order.quantity})`;
          const message = `✅ *Payment Successful!*\n\n${productList}\nAmount: ₹${order.totalAmount}\n\nDelivery Details:\nName: ${order.customerName}\nAddress: ${order.customerAddress}\n\n📦 Your order is confirmed. We'll contact you soon for delivery!`;
          
          await this.razorpayService.sendOrderConfirmation(
            order.customerPhone,
            phoneNumberId,
            order
          );
        }
        
        return { success: true, message: 'Payment confirmed' };
      }
      
      return { success: false, message: 'Order not found' };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return { success: false, message: error.message };
    }
  }
}
