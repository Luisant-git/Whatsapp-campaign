import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OwnerNotificationService {
  private readonly logger = new Logger(OwnerNotificationService.name);

  async notifyAppointmentBooking(
    appointment: any,
    ownerPhone: string,
    accessToken: string,
    phoneNumberId: string
  ) {
    try {
      const message = `🗓️ *NEW DEMO REQUEST*

👤 *Customer:* ${appointment.name}
📞 *Mobile:* ${appointment.phone}
📍 *Place:* ${this.extractPlace(appointment.moreDetails)}

🏢 *Business Details:*
Name: ${this.extractBusinessName(appointment.moreDetails)}
Type: ${this.extractBusinessType(appointment.moreDetails)}
Size: ${this.extractBusinessSize(appointment.moreDetails)}

💼 *Service Interested:* ${this.formatService(appointment.department)}
📅 *Preferred Date:* ${appointment.date}
⏰ *Preferred Time:* ${appointment.time}

_Received at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;

      await this.sendWhatsAppMessage(ownerPhone, message, accessToken, phoneNumberId);
      this.logger.log(`✅ Appointment notification sent to owner: ${ownerPhone}`);
    } catch (error) {
      this.logger.error('Failed to send appointment notification:', error.message);
    }
  }

  async notifyOrderPlaced(
    order: any,
    ownerPhone: string,
    accessToken: string,
    phoneNumberId: string
  ) {
    try {
      const itemsList = order.items?.map((item: any, index: number) => 
        `${index + 1}. ${item.productName || item.product?.name || 'Product'} - ₹${item.price} x ${item.quantity}`
      ).join('\n') || 'No items';

      const message = `🛒 *NEW ORDER RECEIVED*

👤 *Customer:* ${order.customerName}
📞 *Phone:* ${order.customerPhone}

📦 *Order Items:*
${itemsList}

💰 *Total Amount:* ₹${order.totalAmount}
🚚 *Shipping:* ₹${order.shippingAmount || 0}

📍 *Delivery Address:*
${order.customerAddress}
${order.customerCity}, ${order.customerState} - ${order.customerPincode}

💳 *Payment:* ${order.paymentMethod || 'COD'}
📊 *Status:* ${order.status}

_Received at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;

      await this.sendWhatsAppMessage(ownerPhone, message, accessToken, phoneNumberId);
      this.logger.log(`✅ Order notification sent to owner: ${ownerPhone}`);
    } catch (error) {
      this.logger.error('Failed to send order notification:', error.message);
    }
  }

  private formatService(service: string): string {
    const serviceMap: { [key: string]: string } = {
      'all': '🌟 All Services',
      'whatsapp_marketing': '📢 WhatsApp Marketing',
      'whatsapp_ecommerce': '🛒 WhatsApp Ecommerce',
      'ai_chatbot': '🤖 AI Chat Bot'
    };
    return serviceMap[service] || service;
  }

  private extractPlace(details: string): string {
    const match = details?.match(/Place: ([^,]+)/);
    return match ? match[1] : 'N/A';
  }

  private extractBusinessName(details: string): string {
    const match = details?.match(/Business: ([^,]+)/);
    return match ? match[1] : 'N/A';
  }

  private extractBusinessType(details: string): string {
    const match = details?.match(/Type: ([^,]+)/);
    return match ? match[1] : 'N/A';
  }

  private extractBusinessSize(details: string): string {
    const match = details?.match(/Size: (.+)/);
    return match ? match[1] : 'N/A';
  }

  private async sendWhatsAppMessage(
    to: string,
    message: string,
    accessToken: string,
    phoneNumberId: string
  ) {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }
}
