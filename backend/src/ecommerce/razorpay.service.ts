import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RazorpayService {
  private readonly accessToken = process.env.META_ACCESS_TOKEN;
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';

  async sendPaymentRequest(phone: string, phoneNumberId: string, amount: number, orderId: number) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'interactive',
          interactive: {
            type: 'order_details',
            body: {
              text: `Order #${orderId}\nTotal Amount: ₹${amount}`
            },
            action: {
              name: 'review_and_pay',
              parameters: {
                reference_id: `order_${orderId}`,
                type: 'digital-goods',
                payment_type: 'razorpay',
                currency: 'INR',
                total_amount: {
                  value: Math.round(amount * 100),
                  offset: 100
                },
                order: {
                  status: 'pending',
                  items: [{
                    name: `Order #${orderId}`,
                    amount: {
                      value: Math.round(amount * 100),
                      offset: 100
                    },
                    quantity: 1
                  }]
                }
              }
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Meta payment request error:', error.response?.data || error.message);
      throw new Error('Failed to send payment request');
    }
  }
}
