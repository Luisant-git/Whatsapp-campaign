import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RazorpayService {
  private readonly accessToken = process.env.META_ACCESS_TOKEN;
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';

  async sendPaymentRequest(phone: string, phoneNumberId: string, amount: number, orderId: number, productName?: string) {
    try {
      const subtotal = Math.round(amount * 100);
      const totalAmount = subtotal;

      console.log('[Razorpay] Sending payment request:', { phone, orderId, amount, productName });

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
                payment_settings: [
                  {
                    type: 'payment_gateway',
                    payment_gateway: {
                      type: 'razorpay',
                      configuration_name: 'Payment_Razorpay'
                    }
                  }
                ],
                currency: 'INR',
                total_amount: {
                  value: totalAmount,
                  offset: 100
                },
                order: {
                  status: 'pending',
                  items: [{
                    retailer_id: `item_${orderId}`,
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
      console.log('[Razorpay] Payment request sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[Razorpay] Payment request error:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendPaymentRequestMultiple(phone: string, phoneNumberId: string, totalAmount: number, orderId: number, items: any[]) {
    try {
      const subtotal = Math.round(totalAmount * 100);

      console.log('[Razorpay] Sending payment request for multiple items:', { phone, orderId, totalAmount, items });

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
              text: `Order #${orderId}\nTotal Amount: ₹${totalAmount}`
            },
            action: {
              name: 'review_and_pay',
              parameters: {
                reference_id: `order_${orderId}_${Date.now()}`,
                type: 'digital-goods',
                payment_settings: [
                  {
                    type: 'payment_gateway',
                    payment_gateway: {
                      type: 'razorpay',
                      configuration_name: 'Payment_Razorpay'
                    }
                  }
                ],
                currency: 'INR',
                total_amount: {
                  value: subtotal,
                  offset: 100
                },
                order: {
                  status: 'pending',
                  items: items.map((item, idx) => ({
                    retailer_id: `item_${orderId}_${idx}`,
                    name: item.name,
                    amount: {
                      value: Math.round(item.price * 100),
                      offset: 100
                    },
                    quantity: item.quantity
                  })),
                  subtotal: {
                    value: subtotal,
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
      console.log('[Razorpay] Payment request sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[Razorpay] Payment request error:', error.response?.data || error.message);
      throw error;
    }
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

  async sendOrderConfirmation(phone: string, phoneNumberId: string, order: any) {
    const productList = order.product ? `${order.product.name} (x${order.quantity})` : 'Your order';
    const message = `✅ *Payment Successful!*\n\n${productList}\nAmount: ₹${order.totalAmount}\n\nDelivery Details:\nName: ${order.customerName}\nAddress: ${order.customerAddress}\n\n📦 Your order is confirmed. We'll deliver within 3-5 business days.\n\nThank you! 🙂`;
    
    await axios.post(
      `${this.apiUrl}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
