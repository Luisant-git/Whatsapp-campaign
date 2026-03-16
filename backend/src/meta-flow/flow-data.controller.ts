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
    console.log('=== ENCRYPTED FLOW DATA REQUEST ===');
    console.log('Body keys:', Object.keys(body));
    console.log('Has encrypted_flow_data:', !!body.encrypted_flow_data);
    console.log('Has encrypted_aes_key:', !!body.encrypted_aes_key);
    console.log('Has initial_vector:', !!body.initial_vector);
    console.log('================================');

    try {
      // Decrypt the request
      const { data: decryptedData, aesKey, iv } = this.decryptRequest(
        body.encrypted_flow_data || '',
        body.encrypted_aes_key || '',
        body.initial_vector || ''
      );

      console.log('📋 Decrypted request:');
      console.log('Screen:', decryptedData.screen);
      console.log('Action:', decryptedData.action);
      console.log('Flow Token:', decryptedData.flow_token);
      console.log('Data:', JSON.stringify(decryptedData.data, null, 2));

      let response;

      // Handle different actions
      if (decryptedData.action === 'ping') {
        response = {
          data: {
            status: 'active'
          }
        };
      } else if (decryptedData.action === 'INIT' || decryptedData.screen === 'APPOINTMENT') {
        console.log('📅 Providing appointment data...');
        response = {
          screen: 'APPOINTMENT',
          data: {
            department: [
              { id: '1', title: 'Sales' },
              { id: '2', title: 'Support' },
              { id: '3', title: 'Technical' }
            ],
            location: [
              { id: '1', title: 'New York' },
              { id: '2', title: 'London' }
            ],
            date: [
              { id: '2026-03-16', title: 'Sun Mar 16 2026' },
              { id: '2026-03-17', title: 'Mon Mar 17 2026' }
            ],
            time: [
              { id: '10:30', title: '10:30 AM' },
              { id: '11:30', title: '11:30 AM' },
              { id: '14:30', title: '2:30 PM' }
            ]
          }
        };
      } else {
        response = {
          screen: 'SUCCESS',
          data: {
            message: 'Flow completed successfully'
          }
        };
      }

      console.log('📤 Sending response:', JSON.stringify(response, null, 2));

      // Encrypt and return response
      const encryptedResponse = this.encryptResponse(response, aesKey, iv);
      return encryptedResponse;

    } catch (error) {
      console.error('❌ Flow data error:', error.message);
      console.error('Stack:', error.stack);
      
      // Return encrypted error response
      const errorResponse = {
        screen: 'APPOINTMENT',
        data: {
          department: [
            { id: '1', title: 'Sales' },
            { id: '2', title: 'Support' }
          ],
          location: [
            { id: '1', title: 'New York' }
          ],
          date: [
            { id: '2026-03-17', title: 'Mon Mar 17 2026' }
          ],
          time: [
            { id: '10:30', title: '10:30 AM' }
          ]
        }
      };
      
      // Try to encrypt error response if we have keys
      try {
        const { aesKey, iv } = this.decryptRequest('', body.encrypted_aes_key || '', body.initial_vector || '');
        return this.encryptResponse(errorResponse, aesKey, iv);
      } catch {
        return errorResponse;
      }
    }
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
    console.log('📅 Loading appointment data from database...');
    
    // Get dynamic data from database
    const departments = await this.flowAppointmentService.getDepartments();
    const locations = await this.flowAppointmentService.getLocations();
    const timeSlots = await this.flowAppointmentService.getTimeSlots();
    const dates = this.generateDates(7);

    const response = {
      data: {
        department: departments,
        location: locations,
        date: dates,
        time: timeSlots
      }
    };

    console.log(`📅 Loaded: departments:${departments.length} locations:${locations.length} dates:${dates.length} times:${timeSlots.length}`);
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

  private decryptRequest(encryptedFlowData: string, encryptedAesKey: string, initialVector: string): { data: any; aesKey: Buffer; iv: Buffer } {
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
  }

  private encryptResponse(response: any, aesKey: Buffer, iv: Buffer): string {
    // Flip the initialization vector
    const flippedIV = Buffer.from(iv.map(byte => byte ^ 0xFF));
    
    const algorithm = aesKey.length === 16 ? 'aes-128-gcm' : 'aes-256-gcm';
    const cipher = crypto.createCipheriv(algorithm, aesKey, flippedIV);
    
    let encrypted = cipher.update(JSON.stringify(response), 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    const finalEncrypted = Buffer.concat([encrypted, authTag]);
    
    return finalEncrypted.toString('base64');
  }
}