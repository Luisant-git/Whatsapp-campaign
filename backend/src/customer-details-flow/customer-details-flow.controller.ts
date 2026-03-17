import { Controller, Post, Body, HttpCode, Res, Get, Headers } from '@nestjs/common';
import { CustomerDetailsFlowService } from '../whatsapp/flows/customer-details-flow.service';
import { Public } from '../auth/public.decorator';
import * as crypto from 'crypto';

@Controller('customer-details-flow')
export class CustomerDetailsFlowController {
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

  constructor(
    private readonly customerDetailsFlowService: CustomerDetailsFlowService
  ) {}

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'Customer Details Flow API is working',
      endpoint: '/customer-details-flow/exchange',
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Post('health')
  @HttpCode(200)
  async postHealth(@Body() body: any, @Headers() headers: any) {
    console.log('🔥 HEALTH CHECK REQUEST RECEIVED!');
    console.log('Body keys:', Object.keys(body));
    console.log('Is encrypted request:', this.isEncryptedRequest(body));

    try {
      const healthResponse = {
        data: {
          status: 'active'
        }
      };

      // Handle encrypted vs unencrypted requests
      if (this.isEncryptedRequest(body)) {
        console.log('🔐 Processing encrypted health check (PRODUCTION MODE)...');
        const { aesKey, iv } = this.decryptRequest(
          body.encrypted_flow_data || '',
          body.encrypted_aes_key,
          body.initial_vector
        );
        
        console.log('📤 Sending encrypted health response:', JSON.stringify(healthResponse, null, 2));
        
        // Encrypt and return response
        return this.encryptResponse(healthResponse, aesKey, iv);
      } else {
        console.log('🔓 Processing unencrypted health check (TEST MODE)...');
        console.log('📤 Sending unencrypted health response:', JSON.stringify(healthResponse, null, 2));
        
        return healthResponse;
      }

    } catch (error) {
      console.error('❌ Health check error:', error.message);
      console.error('Stack:', error.stack);
      
      // Return basic health response on error
      return {
        data: {
          status: 'active'
        }
      };
    }
  }

  @Public()
  @Post('exchange')
  @HttpCode(200)
  async handleFlowExchange(@Body() body: any, @Headers() headers: any) {
    console.log('🔥 CUSTOMER DETAILS FLOW REQUEST RECEIVED!');
    console.log('Body keys:', Object.keys(body));
    console.log('Is encrypted request:', this.isEncryptedRequest(body));

    try {
      let requestData: any = {};

      // Handle encrypted vs unencrypted requests
      if (this.isEncryptedRequest(body)) {
        console.log('🔐 Processing encrypted request (PRODUCTION MODE)...');
        const { data: decryptedData, aesKey, iv } = this.decryptRequest(
          body.encrypted_flow_data,
          body.encrypted_aes_key,
          body.initial_vector
        );
        requestData = decryptedData;
        console.log('📋 Decrypted data:', JSON.stringify(requestData, null, 2));
        
        // Process request and generate response
        const response = await this.processFlowRequest(requestData);
        console.log('📤 Sending encrypted response:', JSON.stringify(response, null, 2));
        
        // Encrypt and return response
        return this.encryptResponse(response, aesKey, iv);
      } else {
        console.log('🔓 Processing unencrypted request (TEST MODE)...');
        requestData = body;
        console.log('📋 Unencrypted data:', JSON.stringify(requestData, null, 2));
        
        // Process request and return unencrypted response
        const response = await this.processFlowRequest(requestData);
        console.log('📤 Sending unencrypted response:', JSON.stringify(response, null, 2));
        
        return response;
      }

    } catch (error) {
      console.error('❌ Customer Details Flow error:', error.message);
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

  private async processFlowRequest(requestData: any): Promise<{ screen: string; data: any }> {
    const { screen, data, action, flow_token, version } = requestData;
    
    console.log(`🎯 Processing action: ${action}, screen: ${screen}`);
    
    // Handle health check (ping)
    if (action === 'ping') {
      console.log('Health check ping received');
      return {
        data: {
          status: 'active'
        }
      } as any;
    }
    
    if (action === 'INIT') {
      try {
        const customerDetailsData = {
          customer_name: '',
          customer_address: '',
          customer_city: '',
          customer_pincode: '',
          payment_methods: [
            { id: 'razorpay', title: 'Pay Online' },
            { id: 'cod', title: 'Cash on Delivery' }
          ]
        };
        
        console.log('Providing customer details initial data:', customerDetailsData);
        
        return {
          screen: 'CUSTOMER_DETAILS',
          data: customerDetailsData
        };
      } catch (error) {
        console.error('Error getting customer details initial data:', error);
        return {
          screen: 'CUSTOMER_DETAILS',
          data: {
            customer_name: '',
            customer_address: '',
            customer_city: '',
            customer_pincode: '',
            payment_methods: [
              { id: 'cod', title: 'Cash on Delivery' }
            ]
          }
        };
      }
    }
    
    if (action === 'data_exchange' && screen === 'SUMMARY') {
      try {
        console.log('🔍 SUMMARY screen data exchange - Customer Details');
        console.log('🔍 Data field:', JSON.stringify(data, null, 2));
        console.log('🔍 Flow token:', flow_token);
        
        const customerData = await this.customerDetailsFlowService.saveCustomerDetailsFromFlow(data, flow_token);
        
        return {
          screen: 'SUCCESS',
          data: {
            extension_message_response: {
              params: {
                flow_token: flow_token || 'completed',
                customer_data: JSON.stringify(customerData),
                message: 'Customer details collected successfully!'
              }
            }
          }
        };
      } catch (error) {
        console.error('Error saving customer details:', error);
        return {
          screen: 'SUMMARY',
          data: {
            error_message: 'Sorry, we could not save your details. Please try again.'
          }
        };
      }
    }
    
    console.log('Unhandled action:', action, 'screen:', screen);
    return { screen: screen || 'CUSTOMER_DETAILS', data: data || {} };
  }

  private getErrorResponse(): { screen: string; data: any } {
    return {
      screen: 'CUSTOMER_DETAILS',
      data: {
        customer_name: '',
        customer_address: '',
        customer_city: '',
        customer_pincode: '',
        payment_methods: [
          { id: 'cod', title: 'Cash on Delivery' }
        ]
      }
    };
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
        data: { action: 'INIT', screen: 'CUSTOMER_DETAILS' },
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