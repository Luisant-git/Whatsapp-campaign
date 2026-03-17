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

  decryptRequest(encryptedFlowData: string, encryptedAesKey: string, initialVector: string): { data: any; aesKey: Buffer; iv: Buffer; isInit?: boolean } {
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
        data: { action: 'INIT', version: '1.0' },
        aesKey,
        iv,
        isInit: true
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
      
      if (parsed.action === 'INIT') {
        return {
          data: parsed,
          aesKey,
          iv,
          isInit: true
        };
      }
    
      return {
        data: parsed,
        aesKey,
        iv,
        isInit: false
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
        
        // Get dynamic data from database
        console.log('🔍 Attempting to load data from database...');
        const departments = await this.flowAppointmentService.getDepartments();
        console.log('📋 Departments from DB:', departments);
        
        const locations = await this.flowAppointmentService.getLocations();
        console.log('📍 Locations from DB:', locations);
        
        const timeSlots = await this.flowAppointmentService.getTimeSlots();
        console.log('⏰ Time slots from DB:', timeSlots);
        
        const dates = this.generateDates(7);
        
        const appointmentData = {
          department: departments.length > 0 ? departments : [
            { id: 'sales', title: 'Sales' },
            { id: 'support', title: 'Support' },
            { id: 'technical', title: 'Technical' }
          ],
          location: locations.length > 0 ? locations : [
            { id: 'new_york', title: 'New York Office' },
            { id: 'london', title: 'London Office' }
          ],
          date: dates,
          time: timeSlots.length > 0 ? timeSlots.filter(slot => slot.enabled !== false) : [
            { id: '10:30', title: '10:30 AM' },
            { id: '11:30', title: '11:30 AM' },
            { id: '14:30', title: '2:30 PM' },
            { id: '15:30', title: '3:30 PM' }
          ]
        };
        
        console.log('📤 INIT response data:', JSON.stringify(appointmentData, null, 2));
        
        return {
          screen: 'APPOINTMENT',
          data: appointmentData
        };
      } catch (error) {
        console.error('❌ Error loading appointment data for INIT:', error.message);
        
        // Fallback to static data
        const fallbackData = {
          department: [
            { id: 'sales', title: 'Sales' },
            { id: 'support', title: 'Support' },
            { id: 'technical', title: 'Technical' }
          ],
          location: [
            { id: 'new_york', title: 'New York Office' },
            { id: 'london', title: 'London Office' }
          ],
          date: this.generateDates(7),
          time: [
            { id: '10:30', title: '10:30 AM' },
            { id: '11:30', title: '11:30 AM' },
            { id: '14:30', title: '2:30 PM' },
            { id: '15:30', title: '3:30 PM' }
          ]
        };
        
        return {
          screen: 'APPOINTMENT',
          data: fallbackData
        };
      }
    }
    
    if (action === 'data_exchange') {
      // Resolve tenant from phone_number_id or flow_token
      let tenantId: string;
      
      if (phoneNumberId) {
        const tenant = await this.centralPrisma.tenant.findFirst({
          where: { phoneNumberId: phoneNumberId }
        });
        
        if (!tenant) {
          console.error(`❌ Tenant not found for phone_number_id: ${phoneNumberId}`);
          return {
            screen: 'APPOINTMENT',
            data: { error_message: 'Tenant not found' }
          };
        }
        
        tenantId = tenant.id.toString();
        console.log(`✅ Resolved tenant: ${tenantId} from phone_number_id: ${phoneNumberId}`);
      } else if (flow_token) {
        // Extract tenant from flow token pattern: purpose_timestamp_tenantId_random
        const tokenParts = flow_token.split('_');
        if (tokenParts.length >= 3) {
          tenantId = tokenParts[2] || '1';
        } else {
          tenantId = '1'; // fallback
        }
        console.log(`✅ Extracted tenant: ${tenantId} from flow_token: ${flow_token}`);
      } else {
        console.error('❌ No phone_number_id or flow_token provided for tenant resolution');
        return {
          screen: 'APPOINTMENT',
          data: { error_message: 'Cannot resolve tenant' }
        };
      }
      
      console.log(`📤 Processing ${screen} screen for tenant: ${tenantId}`);
      
      try {
        const response = await this.flowManager.handleFlowDataExchange(
          flow_token,
          screen,
          data,
          tenantId
        );
        
        console.log('📤 Flow response:', response);
        return response;
      } catch (error) {
        console.error('❌ Flow data exchange error:', error.message);
        return {
          screen: 'APPOINTMENT',
          data: { error_message: 'Failed to process request' }
        };
      }
      
      if (screen === 'DETAILS') {
        console.log('📤 DETAILS screen - navigating to SUMMARY');
        
        // Get department and location titles
        const deptTitle = await this.flowAppointmentService.getDepartmentTitle(data.department);
        const locTitle = await this.flowAppointmentService.getLocationTitle(data.location);
        
        return {
          screen: 'SUMMARY',
          data: {
            summary: `${deptTitle} at ${locTitle} on ${data.date} at ${data.time}\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}`,
            department: data.department,
            location: data.location,
            date: data.date,
            time: data.time,
            name: data.name,
            email: data.email,
            phone: data.phone
          }
        };
      }
      
      if (screen === 'SUMMARY') {
        try {
          console.log('💾 Saving appointment:', data);
          await this.flowAppointmentService.saveAppointment(data, 1);
          console.log('✅ Appointment saved successfully');
          
          const response = { 
            screen: 'SUCCESS',
            data: {
              extension_message_response: {
                params: {
                  flow_token: data.flow_token || 'completed'
                }
              }
            }
          };
          console.log('Sending response:', JSON.stringify(response));
          return response;
        } catch (error) {
          console.error('❌ Failed to save appointment:', error.message);
          return {
            screen: 'SUMMARY',
            data: {
              error_message: 'Failed to save appointment'
            }
          };
        }
      }
      
      return { 
        screen: 'APPOINTMENT',
        data: data || {}
      };
    }
    
    return { 
      screen: 'APPOINTMENT',
      data: data || {}
    };
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
}
