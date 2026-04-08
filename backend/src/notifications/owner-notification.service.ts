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
      const isBSUID = /^[A-Z]{2}\.([A-Z]+\.)?[0-9]+$/.test(ownerPhone);
      const identifier = isBSUID ? ownerPhone : this.formatPhoneNumber(ownerPhone);
      
      this.logger.log(`📞 Sending appointment notification to: ${identifier} (type: ${isBSUID ? 'BSUID' : 'phone'})`);
      
      try {
        await this.sendAppointmentTemplate(
          identifier,
          appointment,
          accessToken,
          phoneNumberId,
          isBSUID
        );
        this.logger.log(`✅ Appointment template sent to: ${identifier}`);
      } catch (templateError: any) {
        this.logger.warn(`⚠️ Template failed, using text message: ${templateError.message}`);
        if (templateError.response?.data) {
          this.logger.error('Template error details:', JSON.stringify(templateError.response.data, null, 2));
        }
        
        const message = `📆 New Appointment Booked\n\nName: ${appointment.name}\nPhone: ${appointment.phone}\nService: ${this.formatService(appointment.department)}\nDate: ${appointment.date}\nTime: ${appointment.time}`;

        await this.sendWhatsAppMessage(identifier, message, accessToken, phoneNumberId, isBSUID);
        this.logger.log(`✅ Appointment text notification sent to: ${identifier}`);
      }
    } catch (error: any) {
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
      const isBSUID = /^[A-Z]{2}\.([A-Z]+\.)?[0-9]+$/.test(ownerPhone);
      const identifier = isBSUID ? ownerPhone : this.formatPhoneNumber(ownerPhone);
      
      this.logger.log(`📞 Sending order notification to: ${identifier} (type: ${isBSUID ? 'BSUID' : 'phone'})`);
      
      try {
        await this.sendOrderTemplate(
          identifier,
          order,
          accessToken,
          phoneNumberId,
          isBSUID
        );
        this.logger.log(`✅ Order template sent to: ${identifier}`);
      } catch (templateError: any) {
        this.logger.warn(`⚠️ Template failed, using text message: ${templateError.message}`);
        if (templateError.response?.data) {
          this.logger.error('Template error details:', JSON.stringify(templateError.response.data, null, 2));
        }
        
        const message = `🛒 New Order Received\n\nName: ${order.customerName}\nPhone: ${order.customerPhone}\nTotal: ₹${order.totalAmount}\nPayment: ${order.paymentMethod || 'COD'}`;

        await this.sendWhatsAppMessage(identifier, message, accessToken, phoneNumberId, isBSUID);
        this.logger.log(`✅ Order text notification sent to: ${identifier}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to send order notification:', error.message);
      this.logger.error('Error stack:', error.stack);
    }
  }

  private formatPhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
      return `91${cleanPhone}`;
    }
    
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

  private async sendAppointmentTemplate(
    to: string,
    appointment: any,
    accessToken: string,
    phoneNumberId: string,
    isBSUID: boolean = false
  ) {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const payload: any = {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: 'appointment_notify_v2',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: appointment.name || 'Customer' },
              { type: 'text', text: this.formatService(appointment.department) || 'Service' },
              { type: 'text', text: appointment.date || 'N/A' },
              { type: 'text', text: appointment.time || 'N/A' }
            ]
          }
        ]
      }
    };

    if (isBSUID) {
      payload.recipient = to;
    } else {
      payload.to = to;
    }
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  private async sendOrderTemplate(
    to: string,
    order: any,
    accessToken: string,
    phoneNumberId: string,
    isBSUID: boolean = false
  ) {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const payload: any = {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: 'orderreceived_notify_v2',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: order.customerName || 'Customer' },
              { type: 'text', text: order.customerPhone || 'N/A' },
              { type: 'text', text: order.totalAmount?.toString() || '0' },
              { type: 'text', text: order.paymentMethod || 'COD' }
            ]
          }
        ]
      }
    };

    if (isBSUID) {
      payload.recipient = to;
    } else {
      payload.to = to;
    }
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  private async sendWhatsAppMessage(
    to: string,
    message: string,
    accessToken: string,
    phoneNumberId: string,
    isBSUID: boolean = false
  ) {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const payload: any = {
      messaging_product: 'whatsapp',
      type: 'text',
      text: { body: message }
    };

    if (isBSUID) {
      payload.recipient = to;
    } else {
      payload.to = to;
    }
    
    const response = await axios.post(
      url,
      payload,
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
