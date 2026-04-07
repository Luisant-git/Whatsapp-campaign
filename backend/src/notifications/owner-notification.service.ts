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
      const formattedPhone = this.formatPhoneNumber(ownerPhone);
      this.logger.log(`📞 Sending appointment notification to: ${formattedPhone} (original: ${ownerPhone})`);
      
      const message = `📅 New Appointment Booked by

Name: ${appointment.name}
Phone: ${appointment.phone}
Service: ${this.formatService(appointment.department)}
Date: ${appointment.date}
Time: ${appointment.time}`;

      await this.sendWhatsAppMessage(formattedPhone, message, accessToken, phoneNumberId);
      this.logger.log(`✅ Appointment notification sent to owner: ${formattedPhone}`);
    } catch (error) {
      this.logger.error('Failed to send appointment notification:', error.message);
      this.logger.error('Error stack:', error.stack);
    }
  }

  async notifyOrderPlaced(
    order: any,
    ownerPhone: string,
    accessToken: string,
    phoneNumberId: string
  ) {
    try {
      const formattedPhone = this.formatPhoneNumber(ownerPhone);
      this.logger.log(`📞 Sending order notification to: ${formattedPhone} (original: ${ownerPhone})`);
      
      const message = `🛒 New Order Received by

Name: ${order.customerName}
Phone: ${order.customerPhone}
Total: Rs.${order.totalAmount}
Payment: ${order.paymentMethod || 'COD'}`;

      await this.sendWhatsAppMessage(formattedPhone, message, accessToken, phoneNumberId);
      this.logger.log(`✅ Order notification sent to owner: ${formattedPhone}`);
    } catch (error) {
      this.logger.error('Failed to send order notification:', error.message);
      this.logger.error('Error stack:', error.stack);
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // If phone is 10 digits and starts with 6-9, add India country code (91)
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
      return `91${cleanPhone}`;
    }
    
    // If already has country code, return as is
    return cleanPhone;
  }

  private formatService(service: string): string {
    const serviceMap: { [key: string]: string } = {
      'all': 'All Services',
      'whatsapp_marketing': 'WhatsApp Marketing',
      'whatsapp_ecommerce': 'WhatsApp Ecommerce',
      'ai_chatbot': 'AI Chat Bot'
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
