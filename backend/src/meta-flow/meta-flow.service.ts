import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { FlowAppointmentService } from '../flow-appointment/flow-appointment.service';

@Injectable()
export class MetaFlowService {
  private readonly privateKey: string;
  private readonly appSecret = process.env.META_APP_SECRET || '';

  constructor(private flowAppointmentService: FlowAppointmentService) {
    // Load private key from file
    const keyPath = path.join(process.cwd(), 'flow_private.pem');
    this.privateKey = fs.readFileSync(keyPath, 'utf8');
  }

  verifySignature(payload: string, signature: string): boolean {
    if (!signature || !this.appSecret) {
      console.warn('Missing signature or app secret for verification');
      return false;
    }
    
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', this.appSecret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  decryptRequest(encryptedFlowData: string, encryptedAesKey: string, initialVector: string): { data: any; aesKey: Buffer; iv: Buffer } {
    // Decrypt AES key using RSA private key
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
        data: { action: 'ping', version: '3.0' },
        aesKey,
        iv
      };
    }

    // Decrypt flow data using AES-GCM
    const encryptedData = Buffer.from(encryptedFlowData, 'base64');
    const TAG_LENGTH = 16;
    const encryptedDataBody = encryptedData.subarray(0, -TAG_LENGTH);
    const authTag = encryptedData.subarray(-TAG_LENGTH);

    const decipher = crypto.createDecipheriv('aes-128-gcm', aesKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedDataBody);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const data = JSON.parse(decrypted.toString('utf8'));
    return { data, aesKey, iv };
  }

  encryptResponse(response: any, aesKey: Buffer, iv: Buffer): string {
    // Flip the initialization vector
    const flippedIV = Buffer.from(iv.map(byte => byte ^ 0xFF));

    // Encrypt response using AES-GCM
    const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, flippedIV);
    
    let encrypted = cipher.update(JSON.stringify(response), 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    const finalEncrypted = Buffer.concat([encrypted, authTag]);
    
    return finalEncrypted.toString('base64');
  }

  async processFlow(decryptedData: any): Promise<any> {
    const { screen, data, version, action, flow_token } = decryptedData;

    console.log('=== FLOW REQUEST ===');
    console.log('Screen:', screen);
    console.log('Action:', action);
    console.log('Version:', version);
    console.log('Flow Token:', flow_token);
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('==================');

    // Health check request
    if (action === 'ping') {
      return {
        data: {
          status: 'active'
        }
      };
    }

    // Flow initialization
    if (action === 'INIT') {
      // Return initial screen data
      const departments = await this.flowAppointmentService.getDepartments();
      const locations = await this.flowAppointmentService.getLocations();
      const timeSlots = await this.flowAppointmentService.getTimeSlots();
      const dates = this.generateDates(7);

      return {
        screen: 'APPOINTMENT',
        data: {
          department: departments,
          location: locations,
          is_location_enabled: true,
          date: dates,
          is_date_enabled: true,
          time: timeSlots,
          is_time_enabled: true
        }
      };
    }

    // Data exchange requests
    if (action === 'data_exchange') {
      if (screen === 'APPOINTMENT') {
        // Navigate to DETAILS screen
        return {
          screen: 'DETAILS',
          data: {
            department: data.department,
            location: data.location,
            date: data.date,
            time: data.time
          }
        };
      }

      if (screen === 'DETAILS') {
        // Navigate to SUMMARY screen with collected data
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
          // Save appointment and complete flow
          await this.flowAppointmentService.saveAppointmentFromFlow(data);
          
          return {
            screen: 'SUCCESS',
            data: {
              extension_message_response: {
                params: {
                  flow_token: flow_token,
                  appointment_id: Date.now().toString(),
                  department: data.department,
                  location: data.location,
                  date: data.date,
                  time: data.time,
                  name: data.name
                }
              }
            }
          };
        } catch (error) {
          console.error('Failed to save appointment:', error);
          return {
            screen: 'SUMMARY',
            data: {
              ...data,
              error_message: 'Failed to save appointment. Please try again.'
            }
          };
        }
      }
    }

    // Handle back navigation
    if (action === 'BACK') {
      // Return to previous screen with refreshed data if needed
      return {
        screen: screen || 'APPOINTMENT',
        data: data || {}
      };
    }

    // Default response
    return {
      screen: screen || 'APPOINTMENT',
      data: data || {}
    };
  }

  // Handle error notifications from WhatsApp
  async handleErrorNotification(decryptedData: any): Promise<any> {
    const { flow_token, action, data } = decryptedData;
    
    console.log('=== ERROR NOTIFICATION ===');
    console.log('Flow Token:', flow_token);
    console.log('Action:', action);
    console.log('Error:', data?.error);
    console.log('Error Message:', data?.error_message);
    console.log('========================');
    
    return {
      data: {
        acknowledged: true
      }
    };
  }

  // Validate flow token signature (JWT)
  validateFlowTokenSignature(flowTokenSignature: string, flowToken: string): boolean {
    if (!flowTokenSignature || !this.appSecret) {
      return false;
    }

    try {
      const [header, payload, signature] = flowTokenSignature.split('.');
      
      const expectedSignature = crypto
        .createHmac('sha256', this.appSecret)
        .update(`${header}.${payload}`)
        .digest('base64url');
      
      if (signature !== expectedSignature) {
        return false;
      }

      const decodedPayload = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8')
      );
      
      return decodedPayload.flow_token === flowToken;
    } catch (error) {
      console.error('Flow token signature validation failed:', error);
      return false;
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
}