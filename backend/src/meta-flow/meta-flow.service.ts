import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { FlowAppointmentService } from '../flow-appointment/flow-appointment.service';
import { FlowManagerService } from '../whatsapp/flows/flow-manager.service';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class MetaFlowService {
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
  private readonly appSecret = process.env.META_APP_SECRET || '';

  constructor(
    private flowAppointmentService: FlowAppointmentService,
    private flowManager: FlowManagerService,
    private centralPrisma: CentralPrismaService
  ) {}

  verifySignature(payload: string, signature: string): boolean {
    if (!signature || !this.appSecret) return false;
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', this.appSecret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  decryptRequest(encryptedFlowData: string, encryptedAesKey: string, initialVector: string): { data: any; aesKey: Buffer; iv: Buffer } {
    const aesKey = crypto.privateDecrypt(
      { 
        key: this.privateKey, 
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(encryptedAesKey, 'base64')
    );
    
    const iv = Buffer.from(initialVector, 'base64');
    
    if (!encryptedFlowData) {
      return {
        data: { action: 'INIT', version: '3.0' },
        aesKey,
        iv
      };
    }
    
    const encryptedData = Buffer.from(encryptedFlowData, 'base64');
    
    try {
      const TAG_LENGTH = 16;
      const encryptedDataBody = encryptedData.subarray(0, -TAG_LENGTH);
      const authTag = encryptedData.subarray(-TAG_LENGTH);
      
      const algorithm = aesKey.length === 16 ? 'aes-128-gcm' : 'aes-256-gcm';
      
      const decipher = crypto.createDecipheriv(algorithm, aesKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedDataBody);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      const parsed = JSON.parse(decrypted.toString());
    
      return {
        data: parsed,
        aesKey,
        iv
      };
    } catch (error) {
      console.error('AES-GCM decryption failed:', error.message);
      throw error;
    }
  }

  encryptResponse(response: any, aesKey: Buffer, iv: Buffer): any {
    const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, iv);
    
    const encryptedBuffer = Buffer.concat([
      cipher.update(JSON.stringify(response), 'utf8'),
      cipher.final()
    ]);
    
    return {
      encrypted_flow_data: encryptedBuffer.toString('base64'),
      initial_vector: iv.toString('base64')
    };
  }

  async processFlow(decryptedData: any, phoneNumberId?: string): Promise<any> {
    const { screen, data, version, action, flow_token } = decryptedData;

    console.log('=== FLOW REQUEST ===');
    console.log('Screen:', screen);
    console.log('Action:', action);
    console.log('Flow Token:', flow_token);
    console.log('Phone Number ID:', phoneNumberId);
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('==================');

    if (action === 'INIT' || action === 'ping') {
      if (action === 'ping') {
        return { data: { status: 'active' } };
      }
      
      // For INIT, return the first screen with data
      console.log('📤 INIT action - returning first screen data');
      console.log('Flow token:', flow_token);
      
      try {
        // For Flow Builder testing, use default tenant (ID: 1)
        let tenantId = '1';
        
        if (flow_token && flow_token.includes('_')) {
          // Extract tenant from flow token pattern: purpose_timestamp_tenantId_random
          const tokenParts = flow_token.split('_');
          if (tokenParts.length >= 3) {
            tenantId = tokenParts[2] || '1';
          }
        }
        
        console.log(`📤 Using tenant ID: ${tenantId} for INIT`);
        
        // Return WhatsApp Business Services data
        const services = [
          { id: 'all', title: 'All' },
          { id: 'whatsapp_marketing', title: 'WhatsApp Marketing' },
          { id: 'whatsapp_ecommerce', title: 'WhatsApp Ecommerce' },
          { id: 'ai_chatbot', title: 'AI Chat Bot' }
        ];

        const dates = this.generateDates(5);
        const todayDate = new Date().toISOString().split('T')[0];
        const timeSlots = this.generateTimeSlots(todayDate);
        
        const businessServicesData = {
          services: services,
          date: dates,
          time: timeSlots,
          available_times: timeSlots,
          is_date_enabled: true,
          is_time_enabled: true
        };
        
        console.log('📤 INIT response data:', JSON.stringify(businessServicesData, null, 2));
        
        return {
          screen: 'SERVICE_SELECTION',
          data: businessServicesData
        };
      } catch (error) {
        console.error('❌ Error loading business services data for INIT:', error.message);
        
        // Fallback to static data
        const fallbackData = {
          services: [
            { id: 'all', title: 'All' },
            { id: 'whatsapp_marketing', title: 'WhatsApp Marketing' },
            { id: 'ai_chatbot', title: 'AI Chat Bot' }
          ],
          date: this.generateDates(5),
          time: [
            { id: '10:00', title: '10:00 AM' },
            { id: '14:00', title: '02:00 PM' }
          ],
          available_times: [
            { id: '10:00', title: '10:00 AM' },
            { id: '14:00', title: '02:00 PM' }
          ],
          is_date_enabled: true,
          is_time_enabled: true
        };
        
        return {
          screen: 'SERVICE_SELECTION',
          data: fallbackData
        };
      }
    }
    
    if (action === 'data_exchange') {
      // Handle all flow data exchange requests directly (both Flow Builder and real flows)
      console.log(`📤 Processing ${screen} screen for data exchange`);
      
      // Handle SERVICE_SELECTION screen (when service is selected with on-select-action)
      if (screen === 'SERVICE_SELECTION') {
        console.log('📝 Processing SERVICE_SELECTION screen');
        
        // Check if date was changed to refresh available times
        if (data.trigger === 'date_changed' && data.selected_date) {
          console.log('📅 Date changed, refreshing available times for:', data.selected_date);
          
          const services = [
            { id: 'all', title: 'All' },
            { id: 'whatsapp_marketing', title: 'WhatsApp Marketing' },
            { id: 'whatsapp_ecommerce', title: 'WhatsApp Ecommerce' },
            { id: 'ai_chatbot', title: 'AI Chat Bot' }
          ];
          
          const dates = this.generateDates(5);
          const timeSlots = this.generateTimeSlots(data.selected_date);
          
          return {
            screen: 'SERVICE_SELECTION',
            data: {
              services: services,
              date: dates,
              time: timeSlots,
              available_times: timeSlots,
              is_date_enabled: true,
              is_time_enabled: true
            }
          };
        }
        
        // Just acknowledge the selection, stay on the same screen
        return {
          screen: 'SERVICE_SELECTION',
          data: {}
        };
      }
      
      if (screen === 'DETAILS') {
        console.log('📝 Processing DETAILS screen - navigating to SUMMARY');
        
        try {
          // Map service and company IDs to titles
          const serviceTitles = {
            'all': 'All',
            'whatsapp_marketing': 'WhatsApp Marketing',
            'whatsapp_ecommerce': 'WhatsApp Ecommerce',
            'ai_chatbot': 'AI Chat Bot'
          };
          
          const serviceTitle = serviceTitles[data.service] || data.service || 'Unknown';
          
          const serviceSummary = `${serviceTitle} consultation on ${data.date} at ${data.time}`;
          const businessSummary = `Name: ${data.name || 'N/A'}\nMobile: ${data.mobile || 'N/A'}\nPlace: ${data.place || 'N/A'}\nBusiness: ${data.business_name || 'N/A'}\nType: ${data.business_type || 'N/A'}\nSize: ${data.business_size || 'N/A'}`;
          
          return {
            screen: 'SUMMARY',
            data: {
              service_summary: serviceSummary,
              business_summary: businessSummary,
              service: data.service,
              date: data.date,
              time: data.time,
              name: data.name,
              mobile: data.mobile,
              place: data.place,
              business_name: data.business_name,
              business_type: data.business_type,
              business_size: data.business_size
            }
          };
        } catch (error) {
          console.error('❌ Error processing DETAILS:', error.message);
          return {
            screen: 'DETAILS',
            data: {
              error_message: 'Failed to process business details'
            }
          };
        }
      }
      
      if (screen === 'SUMMARY') {
        console.log('💾 Processing SUMMARY screen - saving appointment');
        
        try {
          console.log('📋 Appointment data to save:', JSON.stringify(data, null, 2));
          console.log('🔑 Flow token:', flow_token);
          
          // Save the WhatsApp Business Services appointment
          const appointmentRecord = {
            department: data.service || '',
            location: '',
            date: data.date || '',
            time: data.time || '',
            name: data.name || '',
            email: data.mobile || '',
            phone: data.mobile || '',
            moreDetails: `Place: ${data.place || 'N/A'}, Business: ${data.business_name || 'N/A'}, Type: ${data.business_type || 'N/A'}, Size: ${data.business_size || 'N/A'}`
          };
          
          await this.flowAppointmentService.saveAppointmentFromFlow(appointmentRecord, flow_token);
          
          return {
            screen: 'SUCCESS',
            data: {
              extension_message_response: {
                params: {
                  flow_token: flow_token || 'completed',
                  appointment_id: Date.now().toString(),
                  message: 'Demo scheduled successfully! We will contact you soon.'
                }
              }
            }
          };
        } catch (error) {
          console.error('❌ Failed to save appointment:', error.message);
          return {
            screen: 'SUMMARY',
            data: {
              ...data,
              error_message: 'Failed to schedule demo. Please try again.'
            }
          };
        }
      }
      
      // Handle other screens or unknown screens
      if (screen === 'APPOINTMENT' || !screen) {
        console.log('📅 Processing APPOINTMENT screen - returning initial data');
        
        try {
          // Return WhatsApp Business Services data
          const services = [
            { id: 'all', title: 'All' },
            { id: 'whatsapp_marketing', title: 'WhatsApp Marketing' },
            { id: 'whatsapp_ecommerce', title: 'WhatsApp Ecommerce' },
            { id: 'ai_chatbot', title: 'AI Chat Bot' }
          ];

          const dates = this.generateDates(5);
          const todayDate = new Date().toISOString().split('T')[0];
          const timeSlots = this.generateTimeSlots(todayDate);
          
          const businessServicesData = {
            services: services,
            date: dates,
            time: timeSlots,
            available_times: timeSlots,
            is_date_enabled: true,
            is_time_enabled: true
          };
          
          return {
            screen: 'SERVICE_SELECTION',
            data: businessServicesData
          };
        } catch (error) {
          console.error('❌ Error loading business services data:', error.message);
          return {
            screen: 'SERVICE_SELECTION',
            data: {
              error_message: 'Failed to load service options'
            }
          };
        }
      }
      
      // Default fallback for unknown screens
      console.log(`❓ Unknown screen: ${screen}, returning to SERVICE_SELECTION`);
      return {
        screen: 'SERVICE_SELECTION',
        data: {
          error_message: `Unknown screen: ${screen}`
        }
      };
    }
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

  private generateTimeSlots(selectedDate?: string): Array<{id: string, title: string, enabled?: boolean}> {
    const slots: Array<{id: string, title: string, enabled?: boolean}> = [];
    const startHour = 11;
    const endHour = 18;
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isToday = selectedDate === today;
    
    console.log(`⏰ Time filtering - Current: ${currentHour}:${currentMinute}, Today: ${today}, Selected: ${selectedDate}, IsToday: ${isToday}`);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const hour12 = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      
      let isEnabled = true;
      if (isToday) {
        if (hour < currentHour || (hour === currentHour && currentMinute >= 0)) {
          isEnabled = false;
          console.log(`⏰ Filtering out ${hour}:00 - past time`);
        }
      }
      
      if (!isToday || isEnabled) {
        slots.push({
          id: `${hour.toString().padStart(2, '0')}:00`,
          title: `${hour12.toString().padStart(2, '0')}:00 ${period}`
        });
      }
      
      isEnabled = true;
      if (isToday) {
        if (hour < currentHour || (hour === currentHour && currentMinute >= 30)) {
          isEnabled = false;
          console.log(`⏰ Filtering out ${hour}:30 - past time`);
        }
      }
      
      if (!isToday || isEnabled) {
        slots.push({
          id: `${hour.toString().padStart(2, '0')}:30`,
          title: `${hour12.toString().padStart(2, '0')}:30 ${period}`
        });
      }
    }
    
    console.log(`⏰ Generated ${slots.length} time slots for ${selectedDate || 'no date'}`);
    return slots;
  }
}
