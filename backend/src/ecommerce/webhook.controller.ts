import { Controller, Post, Body, Headers, Param, Req } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { EcommerceService } from './ecommerce.service';
import { MetaCatalogService } from './meta-catalog.service';
import { Public } from '../auth/public.decorator';

@Controller('webhooks')
export class WebhookController {
  constructor(
    private razorpayService: RazorpayService,
    private ecommerceService: EcommerceService,
    private metaCatalogService: MetaCatalogService,
  ) {}

  @Public()
  @Post('whatsapp')
  async handleWebhook(@Req() req: any) {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const message = value?.messages?.[0];

    if (!message) return;

    const phone = message.from;
    const phoneNumberId = value.metadata.phone_number_id;

    // ✅ FLOW RESPONSE HANDLER
    if (message?.interactive?.nfm_reply) {
      const flowData = JSON.parse(
        message.interactive.nfm_reply.response_json
      );

      await this.metaCatalogService.handleCustomerDetailsFlowResponse(
        phone,
        phoneNumberId,
        flowData,
        1 // userId
      );

      return;
    }

    // Handle other message types...
    return { status: 'ok' };
  }

  @Public()
  @Post('razorpay')
  async handleRazorpayWebhook(@Body() body: any, @Headers() headers: any) {
    console.log('[Razorpay Webhook] Received:', body.event);

    const event = body.event;
    const payload = body.payload?.payment?.entity || body.payload?.order?.entity;

    // Only process successful payment events
    if (event === 'payment.captured' || event === 'order.paid') {
      const notes = payload.notes || {};
      const orderId = parseInt(notes.order_id);
      const userId = parseInt(notes.user_id);
      const referenceId = notes.reference_id;

      if (orderId) {
        console.log('[Razorpay Webhook] Payment successful for order:', orderId);
        await this.ecommerceService.updateOrderStatus(orderId, 'placed', userId);
        
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
            
            // Send confirmation ONLY after payment is captured
            console.log('[Razorpay Webhook] Sending order confirmation notification');
            await this.razorpayService.sendOrderConfirmation(
              order.customerPhone,
              phoneNumberId,
              order
            );
          }
        }
      }
    } else {
      console.log('[Razorpay Webhook] Non-success event, skipping notification:', event);
    }

    return { status: 'ok' };
  }

  @Public()
  @Post('payment-success/:orderId')
  async manualPaymentConfirm(@Param('orderId') orderId: string) {
    try {
      const order = await this.ecommerceService.getOrderById(parseInt(orderId));
      
      if (order) {
        await this.ecommerceService.updateOrderStatus(parseInt(orderId), 'placed', undefined);
      
        const phoneNumberId = process.env.PHONE_NUMBER_ID || '';
        if (phoneNumberId) {
        const productName = order.items?.[0]?.product?.name || 'Product';
        const quantity = order.items?.[0]?.quantity || 1;
        const productList = `${productName} (x${quantity})`;
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
