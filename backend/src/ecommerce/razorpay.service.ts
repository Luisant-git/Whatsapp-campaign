import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RazorpayService {
  private readonly keyId = process.env.RAZORPAY_KEY_ID;
  private readonly keySecret = process.env.RAZORPAY_KEY_SECRET;
  private readonly merchantId = process.env.RAZORPAY_MERCHANT_ID || 'acc_JBz4Xiep4JPFoH';

  async createPaymentLink(amount: number, customerName: string, customerPhone: string, orderId: number) {
    try {
      const response = await axios.post(
        'https://api.razorpay.com/v1/payment_links',
        {
          amount: Math.round(amount * 100),
          currency: 'INR',
          description: `Order #${orderId}`,
          customer: {
            name: customerName,
            contact: customerPhone,
          },
          notify: {
            sms: false,
            email: false,
            whatsapp: false,
          },
          callback_url: `${process.env.BACKEND_URL}/api/ecommerce/payment-callback`,
          callback_method: 'get',
        },
        {
          auth: {
            username: this.keyId,
            password: this.keySecret,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Razorpay payment link error:', error.response?.data || error.message);
      throw new Error('Failed to create payment link');
    }
  }

  async verifyPayment(paymentId: string) {
    try {
      const response = await axios.get(
        `https://api.razorpay.com/v1/payments/${paymentId}`,
        {
          auth: {
            username: this.keyId,
            password: this.keySecret,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Razorpay verify payment error:', error.response?.data || error.message);
      throw new Error('Failed to verify payment');
    }
  }
}
