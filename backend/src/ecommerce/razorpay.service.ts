import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RazorpayService {
  private readonly accessToken = process.env.META_ACCESS_TOKEN;
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';

  async sendPaymentRequest(phone: string, phoneNumberId: string, amount: number, orderId: number, productName?: string) {
    const subtotal = Math.round(amount * 100);
    const tax = 0;
    const totalAmount = subtotal + tax;

    const response = await axios.post(
      `${this.apiUrl}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
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
              reference_id: `order_${orderId}_${Date.now()}`,
              type: 'digital-goods',
              payment_type: 'upi',
              payment_configuration: 'Payment_Razorpay',
              currency: 'INR',
              total_amount: {
                value: totalAmount,
                offset: 100
              },
              order: {
                status: 'pending',
                items: [{
                  name: productName || `Order #${orderId}`,
                  amount: {
                    value: subtotal,
                    offset: 100
                  },
                  quantity: 1
                }],
                subtotal: {
                  value: subtotal,
                  offset: 100
                },
                tax: {
                  value: tax,
                  offset: 100
                }
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
  }

  async updateOrderStatus(phone: string, phoneNumberId: string, referenceId: string, status: 'processing' | 'completed' | 'canceled') {
    const response = await axios.post(
      `${this.apiUrl}/${phoneNumberId}/messages`,
      {
        recipient_type: 'individual',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'order_status',
          body: {
            text: `Your order has been ${status}`
          },
          action: {
            name: 'review_order',
            parameters: {
              reference_id: referenceId,
              order: {
                status
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
  }
}
