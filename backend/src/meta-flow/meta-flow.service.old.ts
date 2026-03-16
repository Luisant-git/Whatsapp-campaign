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

  async processFlow(decryptedData: any): Promise<any> {
    const { screen, data, version, action } = decryptedData;

    console.log('=== FLOW REQUEST ===');
    console.log('Screen:', screen);
    console.log('Action:', action);
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('==================');

    if (action === 'INIT' || action === 'ping') {
      return { version: '3.0', data: { status: 'active' } };
    }
    
    if (action === 'data_exchange') {
      if (screen === 'APPOINTMENT') {
        const trigger = data?.trigger;
        console.log('📤 APPOINTMENT trigger:', trigger);
        
        // Fetch dynamic data from database
        const departments = await this.flowAppointmentService.getDepartments();
        const locations = await this.flowAppointmentService.getLocations();
        const timeSlots = await this.flowAppointmentService.getTimeSlots();
        const dates = this.generateDates(7); // Next 7 days
        
        const response = {
          version: '3.0',
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
        console.log('📤 Sending APPOINTMENT response with dynamic data');
        return response;
      }
      
      if (screen === 'DETAILS') {
        console.log('📤 DETAILS screen - navigating to SUMMARY');
        
        // Get department and location titles
        const deptTitle = await this.flowAppointmentService.getDepartmentTitle(data.department);
        const locTitle = await this.flowAppointmentService.getLocationTitle(data.location);
        
        return {
          version: '3.0',
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
            version: '3.0',
            screen: 'SUCCESS',
            data: {}
          };
          console.log('Sending response:', JSON.stringify(response));
          return response;
        } catch (error) {
          console.error('❌ Failed to save appointment:', error.message);
          return {
            version: '3.0',
            screen: 'SUMMARY',
            data: {
              error: 'Failed to save appointment'
            }
          };
        }
      }
      
      return { 
        version: '3.0',
        data: data || {}
      };
    }
    
    return { 
      version: '3.0',
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
