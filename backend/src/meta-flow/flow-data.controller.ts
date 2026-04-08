import { Controller, Post, Get, Body, HttpCode, Headers } from '@nestjs/common';
import { FlowAppointmentService } from '../flow-appointment/flow-appointment.service';
import * as crypto from 'crypto';

@Controller('meta')
export class FlowDataController {
  private readonly privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCxab4BeyDwMHaK
Cr7jZ1gw/DZI+VOqgSKPgzbVJTKjJ+Z/ALOJ88c6bdiDIfDJcMn+3w5SKLoAvgUP
vNBd79juwrpn+j0TjrRSU5HEMbexbERSU0KeDQHMpHOL6Sl/ZBRTaLf21csedDDf
KI4sieDMEI9uYc0m17yzPbBw5aGZNjmWBSKW6hFIsEf6UTqOdbgQhyOMrvJukt/1
vvWgo4tMLdJF0d6/yakoNfmxUsNXkDOWw0Jq44JSJnWBItBs3nhDQnH1tZ5zdCiI
KYev+YqejDAyksqNuBKfWl26d/ekCGIElc5PQj/s85ZPbk+kb8AdZczF0y+gVeFY
UI4M/V7VAgMBAAECggEAGO2TMZET9TvSBB5zaO918FgX5pQF4gDIEuMserGB1nP+
Sp0WHQ2gUkDp+a70rtFGyKWd1QR88irA+k+c9X4EfLPmzkJWf59/DcxJQIh915Ov
W+PwCdYpCRCYXbHSz2AIDRo7MxciNbK8xTZlF7P93p57ENb0JP+ON5804gAZ/zVn
qqP6UAU1YSRIFcVn5SOW+70HE3Ct2XfB8BE4FSUyxpB9YRMjhG63qRGOvqJeTI8p
k/rDkBGPtRxc3IFz5kgk03iU8+IZlyjADEIhuUwN+MZpMg3JeRNMWia/Z60z4ddQ
2jSU7XVtz0+c7P2vXQJTFlepNJ5WQk/CEhYKhvHXRwKBgQDpQ93pvEDd6+8sr99M
Phs0lc87NZ+RSlzHM+EVtwe7K35sShNH/GN3EhLsbVrwd+YE++nj34/m/Aq487FQ
yqdbKdaZxFJBLlQlp4Jy4tXMcvaSMHUMW1Qxts0iFQ2tePfVNVnpEnE1RDgYQwRd
u4cqSIteA0kcYDwGMIhOlzPwNwKBgQDCtFOJh+0lyTaOl2yzJ0PWxi6pgxa9DzSD
xBKNYH0/p9RVMK0LV5/Z4bojZzdAj+ue0TeY/D+VM5spEzXMwmSes5rX3Dvqkn98
aCIHbmp5N1HI+YpNgwD3e9XftltGn1klOYC5viJWIWqEYlPx6xXs0HQyAh4hMCu/
uIIMeXzrUwKBgQDhks+2iGXyNYZFII4/nI+Seoy8JU75oX+242R3K1g+mADZl4it
xFQrgT7rg5S9ljTJ/RJhWoA+Tt3PnVmLV24fqoXsjP0+Kx8UiriLgPBflYz8Mf/+
wxLYQH5+xv1DFAgWFlGsIjl32VClpalDO2WqbhzX/TVmS2nAUo598Zo4YQKBgCN3
eagZzIcPihKbXr+brW3YF/Pk3yV9OZGvC7oZE3ee+Lyz6zGfuoyT47ZDPPtTvBXo
AnqpqGNjTSZES46K8o0+Jjyf74IhQXvF9DzqThbajtlPK3RHIsvyENl5fFL2/+QZ
/2rWSabq215WEviEXDARILljTV26Sp3X3EitcKXlAoGBAN8H4EIZE+l7ysHqx7X1
bLFVEtWIJE7YMcDm2/LH+G6MIDoYG5cwk2z/d8FteIQ7xE2D/lweJlSgUkpottJS
RP+AgXfbu8yAcTjWrr40DwnupV3NoO+4CcvUFkVUWgA97j7PDTwPeXkqYbIdrxU9
sxEK+yx6I1EkGaK+/KWEpai7
-----END PRIVATE KEY-----`;

  constructor(private flowAppointmentService: FlowAppointmentService) {}

  @Post('flows')
  @HttpCode(200)
  async getFlowData(@Body() body: any, @Headers() headers: any) {
    console.log('🔥 FLOW DATA REQUEST RECEIVED!');
    console.log('Body keys:', Object.keys(body));
    console.log('Full body:', JSON.stringify(body, null, 2));
    console.log('Is encrypted request:', this.isEncryptedRequest(body));

    try {
      let screen = 'SERVICE_SELECTION';
      let data = {};
      let action = '';

      // Handle encrypted vs unencrypted requests
      if (this.isEncryptedRequest(body)) {
        console.log('🔐 Processing encrypted request (PRODUCTION MODE)...');
        const { data: decryptedData, aesKey, iv } = this.decryptRequest(
          body.encrypted_flow_data,
          body.encrypted_aes_key,
          body.initial_vector
        );
        screen = decryptedData.screen || 'SERVICE_SELECTION';
        data = decryptedData.data || {};
        action = decryptedData.action || '';
        console.log('📋 Decrypted - Screen:', screen, 'Action:', action, 'Data:', JSON.stringify(data, null, 2));
        
        // Process request and generate response
        const response = await this.routeByScreen(screen, data, action);
        console.log('📤 Sending encrypted response:', JSON.stringify(response, null, 2));
        
        // Encrypt and return response
        return this.encryptResponse(response, aesKey, iv);
      } else {
        console.log('🔓 Processing unencrypted request (TEST MODE)...');
        screen = body.screen || 'SERVICE_SELECTION';
        data = body.data || {};
        action = body.action || '';
        console.log('📋 Unencrypted - Screen:', screen, 'Action:', action, 'Data:', JSON.stringify(data, null, 2));
        
        // Process request and return unencrypted response
        const response = await this.routeByScreen(screen, data, action);
        console.log('📤 Sending unencrypted response:', JSON.stringify(response, null, 2));
        
        return response;
      }

    } catch (error) {
      console.error('❌ Flow data error:', error.message);
      console.error('Stack:', error.stack);
      
      // Always return correct format even for errors
      const errorResponse = this.getErrorResponse();
      
      // If it was an encrypted request, try to encrypt the error response
      if (this.isEncryptedRequest(body)) {
        try {
          const { aesKey, iv } = this.decryptRequest(
            body.encrypted_flow_data || '',
            body.encrypted_aes_key,
            body.initial_vector
          );
          return this.encryptResponse(errorResponse, aesKey, iv);
        } catch (encryptError) {
          console.error('❌ Failed to encrypt error response:', encryptError.message);
          return errorResponse;
        }
      }
      
      return errorResponse;
    }
  }

  private isEncryptedRequest(body: any): boolean {
    return !!(body.encrypted_flow_data && body.encrypted_aes_key && body.initial_vector);
  }

  private async routeByScreen(screen: string, data: any, action?: string): Promise<{ screen: string; data: any }> {
    console.log(`🎯 Routing screen: ${screen}, action: ${action}`);
    
    // Handle INIT action - return first screen data
    if (action === 'INIT' || !screen || screen === 'INIT') {
      console.log('📅 INIT action - Providing service selection data...');
      const appointmentData = await this.getAppointmentData();
      return {
        screen: 'SERVICE_SELECTION',
        data: appointmentData.data
      };
    }
    
    switch (screen) {
      case 'SERVICE_SELECTION':
      case 'APPOINTMENT':
        console.log('📅 Providing service selection data...');
        const appointmentData = await this.getAppointmentData();
        return {
          screen: 'SERVICE_SELECTION',
          data: appointmentData.data
        };

      case 'DETAILS':
        console.log('📝 Processing business details...');
        // Pass through the service selection data to the details screen
        return {
          screen: 'DETAILS',
          data: {
            service: data?.service || '',
            company: data?.company || '',
            date: data?.date || '',
            time: data?.time || ''
          }
        };

      case 'SUMMARY':
        console.log('📊 Generating summary...');
        const serviceTitles = {
          'whatsapp_marketing': 'WhatsApp Marketing',
          'whatsapp_ecommerce': 'WhatsApp Ecommerce',
          'ai_chatbot': 'AI Chat Bot'
        };
        const companyTitles = {
          'meta': 'Meta (WhatsApp Official)',
          'partner': 'WhatsApp Business Partner',
          'independent': 'Independent Consultant'
        };
        
        const serviceTitle = serviceTitles[data?.service] || data?.service || 'Unknown';
        const companyTitle = companyTitles[data?.company] || data?.company || 'Unknown';
        
        const serviceSummary = `${serviceTitle} consultation with ${companyTitle} on ${data?.date || 'Unknown'} at ${data?.time || 'Unknown'}`;
        const businessSummary = `Name: ${data?.name || 'N/A'}\nMobile: ${data?.mobile || 'N/A'}\nPlace: ${data?.place || 'N/A'}\nBusiness: ${data?.business_name || 'N/A'}\nType: ${data?.business_type || 'N/A'}\nSize: ${data?.business_size || 'N/A'}`;
        
        return {
          screen: 'SUMMARY',
          data: {
            service_summary: serviceSummary,
            business_summary: businessSummary,
            service: data?.service || '',
            company: data?.company || '',
            date: data?.date || '',
            time: data?.time || '',
            name: data?.name || '',
            mobile: data?.mobile || '',
            place: data?.place || '',
            business_name: data?.business_name || '',
            business_type: data?.business_type || '',
            business_size: data?.business_size || ''
          }
        };

      case 'TERMS':
        console.log('📜 Showing terms and conditions...');
        return {
          screen: 'TERMS',
          data: {}
        };

      case 'CUSTOMER_DETAILS':
        console.log('👤 Providing customer details dropdown data...');
        const customerData = await this.getCustomerDetailsData();
        return {
          screen: 'CUSTOMER_DETAILS',
          data: customerData.data
        };

      case 'COMPLETE_ORDER':
        console.log('💾 Saving customer order...');
        try {
          await this.flowAppointmentService.saveOrder(data, 1);
          return {
            screen: 'SUCCESS',
            data: {
              message: 'Order placed successfully! We will contact you soon.'
            }
          };
        } catch (error) {
          console.error('❌ Failed to save order:', error.message);
          return {
            screen: 'CUSTOMER_DETAILS',
            data: {
              ...data,
              error: 'Failed to place order. Please try again.'
            }
          };
        }

      case 'CONFIRM_APPOINTMENT':
        console.log('💾 Saving WhatsApp Business appointment...');
        try {
          // Save the appointment data
          await this.flowAppointmentService.saveAppointmentFromFlow(data);
          return {
            screen: 'SUCCESS',
            data: {
              message: 'Demo scheduled successfully! We will contact you soon.'
            }
          };
        } catch (error) {
          console.error('❌ Failed to save appointment:', error.message);
          return {
            screen: 'SUMMARY',
            data: {
              ...data,
              error: 'Failed to schedule demo. Please try again.'
            }
          };
        }

      default:
        console.log('❓ Unknown screen, defaulting to SERVICE_SELECTION');
        return this.getErrorResponse();
    }
  }

  private getErrorResponse(): { screen: string; data: any } {
    return {
      screen: 'SERVICE_SELECTION',
      data: {
        services: [
          { id: 'whatsapp_marketing', title: 'WhatsApp Marketing' },
          { id: 'whatsapp_ecommerce', title: 'WhatsApp Ecommerce' },
          { id: 'ai_chatbot', title: 'AI Chat Bot' }
        ],
        company: [
          { id: 'meta', title: 'Meta (WhatsApp Official)' },
          { id: 'partner', title: 'WhatsApp Business Partner' }
        ],
        date: [{ id: '2026-03-17', title: 'Mon Mar 17 2026' }],
        time: this.generateTimeSlots(),
        is_date_enabled: true,
        is_time_enabled: true,
        is_company_enabled: true
      }
    };
  }

  @Get('flows')
  async testEndpoint() {
    return {
      status: 'active',
      message: 'Flow data endpoint is working',
      timestamp: new Date().toISOString()
    };
  }

  private async getAppointmentData() {
    console.log('📅 Loading WhatsApp Business Services data...');
    
    const services = [
      { id: 'whatsapp_marketing', title: 'WhatsApp Marketing' },
      { id: 'whatsapp_ecommerce', title: 'WhatsApp Ecommerce' },
      { id: 'ai_chatbot', title: 'AI Chat Bot' }
    ];

    const companies = [
      { id: 'meta', title: 'Meta (WhatsApp Official)' },
      { id: 'partner', title: 'WhatsApp Business Partner' },
      { id: 'independent', title: 'Independent Consultant' }
    ];

    const dates = this.generateDates(5);

    const timeSlots = this.generateTimeSlots();

    const response = {
      data: {
        services: services,
        company: companies,
        date: dates,
        time: timeSlots,
        is_date_enabled: true,
        is_time_enabled: true,
        is_company_enabled: true
      }
    };

    console.log(`📅 Loaded: services:${services.length} companies:${companies.length} dates:${dates.length} times:${timeSlots.length}`);
    return response;
  }

  private handleAppointmentDetails(data: any) {
    console.log('📝 Processing appointment details...');
    
    // Navigate to summary screen with form data
    return {
      screen: 'SUMMARY',
      data: {
        summary: `${data.department} at ${data.location} on ${data.date} at ${data.time}\\n\\nName: ${data.name}\\nEmail: ${data.email}\\nPhone: ${data.phone}`,
        ...data
      }
    };
  }

  private async saveAppointment(data: any, flowToken: string) {
    console.log('💾 Saving appointment...', { flowToken });
    
    try {
      // Save to database
      await this.flowAppointmentService.saveAppointment(data, 1);
      
      console.log('✅ Appointment saved successfully');
      
      return {
        screen: 'SUCCESS',
        data: {
          message: 'Appointment booked successfully!'
        }
      };
    } catch (error) {
      console.error('❌ Failed to save appointment:', error.message);
      
      return {
        screen: 'SUMMARY',
        data: {
          ...data,
          error: 'Failed to save appointment. Please try again.'
        }
      };
    }
  }

  private async getCustomerDetailsData() {
    console.log('👤 Loading customer details data...');
    
    const states = [
      { "id": "AN", "title": "Andaman and Nicobar Islands" },
      { "id": "AP", "title": "Andhra Pradesh" },
      { "id": "AR", "title": "Arunachal Pradesh" },
      { "id": "AS", "title": "Assam" },
      { "id": "BR", "title": "Bihar" },
      { "id": "CH", "title": "Chandigarh" },
      { "id": "CT", "title": "Chhattisgarh" },
      { "id": "DN", "title": "Dadra and Nagar Haveli and Daman and Diu" },
      { "id": "DL", "title": "Delhi" },
      { "id": "GA", "title": "Goa" },
      { "id": "GJ", "title": "Gujarat" },
      { "id": "HR", "title": "Haryana" },
      { "id": "HP", "title": "Himachal Pradesh" },
      { "id": "JK", "title": "Jammu and Kashmir" },
      { "id": "JH", "title": "Jharkhand" },
      { "id": "KA", "title": "Karnataka" },
      { "id": "KL", "title": "Kerala" },
      { "id": "LA", "title": "Ladakh" },
      { "id": "LD", "title": "Lakshadweep" },
      { "id": "MP", "title": "Madhya Pradesh" },
      { "id": "MH", "title": "Maharashtra" },
      { "id": "MN", "title": "Manipur" },
      { "id": "ML", "title": "Meghalaya" },
      { "id": "MZ", "title": "Mizoram" },
      { "id": "NL", "title": "Nagaland" },
      { "id": "OR", "title": "Odisha" },
      { "id": "PY", "title": "Puducherry" },
      { "id": "PB", "title": "Punjab" },
      { "id": "RJ", "title": "Rajasthan" },
      { "id": "SK", "title": "Sikkim" },
      { "id": "TN", "title": "Tamil Nadu" },
      { "id": "TG", "title": "Telangana" },
      { "id": "TR", "title": "Tripura" },
      { "id": "UP", "title": "Uttar Pradesh" },
      { "id": "UT", "title": "Uttarakhand" },
      { "id": "WB", "title": "West Bengal" }
    ];

    const paymentMethods = [
      { "id": "cod", "title": "Cash on Delivery" },
      { "id": "razorpay", "title": "Pay Online" }
    ];

    const response = {
      data: {
        customerState: states,
        paymentMethod: paymentMethods
      }
    };

    console.log(`👤 Loaded: states:${states.length} paymentMethods:${paymentMethods.length}`);
    return response;
  }

  private generateDates(days: number): Array<{id: string, title: string}> {
    const dates: Array<{id: string, title: string}> = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const dateTitle = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
      });
      
      dates.push({
        id: dateStr,
        title: dateTitle
      });
    }
    
    return dates;
  }

  private generateTimeSlots(): Array<{id: string, title: string}> {
    const slots: Array<{id: string, title: string}> = [];
    const startHour = 11;
    const endHour = 18; // 6 PM in 24-hour format
    
    for (let hour = startHour; hour < endHour; hour++) {
      // Add :00 slot
      const hour12 = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      slots.push({
        id: `${hour.toString().padStart(2, '0')}:00`,
        title: `${hour12.toString().padStart(2, '0')}:00 ${period}`
      });
      
      // Add :30 slot
      slots.push({
        id: `${hour.toString().padStart(2, '0')}:30`,
        title: `${hour12.toString().padStart(2, '0')}:30 ${period}`
      });
    }
    
    return slots;
  }

  private decryptRequest(encryptedFlowData: string, encryptedAesKey: string, initialVector: string): { data: any; aesKey: Buffer; iv: Buffer } {
    console.log('🔐 Decrypting request...');
    
    // Decrypt AES key using RSA private key
    const aesKey = crypto.privateDecrypt(
      { 
        key: this.privateKey, 
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(encryptedAesKey, 'base64')
    );
    
    const iv = Buffer.from(initialVector, 'base64');
    console.log('🔑 AES Key length:', aesKey.length, 'IV length:', iv.length);
    
    if (!encryptedFlowData) {
      return {
        data: { action: 'INIT', screen: 'APPOINTMENT' },
        aesKey,
        iv
      };
    }
    
    // Decrypt flow data using AES-256-CBC
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    
    let decrypted = decipher.update(encryptedFlowData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    const parsed = JSON.parse(decrypted);
    console.log('📋 Decrypted data:', JSON.stringify(parsed, null, 2));
    
    return {
      data: parsed,
      aesKey,
      iv
    };
  }

  private encryptResponse(response: any, aesKey: Buffer, iv: Buffer): string {
    console.log('🔒 Encrypting response...');
    console.log('📤 Response to encrypt:', JSON.stringify(response, null, 2));
    
    // Encrypt response using AES-256-CBC with same IV
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    
    let encrypted = cipher.update(JSON.stringify(response), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    console.log('🔒 Encrypted response length:', encrypted.length);
    return encrypted;
  }
}