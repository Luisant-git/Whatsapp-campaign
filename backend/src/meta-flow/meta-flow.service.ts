import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class MetaFlowService {
  private readonly privateKey = process.env.META_FLOW_PRIVATE_KEY || '';
  private readonly appSecret = process.env.META_APP_SECRET || '';

  verifySignature(payload: string, signature: string): boolean {
    if (!signature || !this.appSecret) return false;
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', this.appSecret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  decryptRequest(encryptedFlowData: string, encryptedAesKey: string, initialVector: string): any {
    const privateKey = this.privateKey.replace(/\\n/g, '\n');
    const aesKey = crypto.privateDecrypt(
      { 
        key: privateKey, 
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(encryptedAesKey, 'base64')
    );
    
    console.log('AES Key Length:', aesKey.length);
    const iv = Buffer.from(initialVector, 'base64');
    console.log('IV Length:', iv.length);
    
    const decipher = crypto.createDecipheriv('aes-128-cbc', aesKey, iv);
    decipher.setAutoPadding(true);
    
    const decryptedBuffer = Buffer.concat([
      decipher.update(Buffer.from(encryptedFlowData, 'base64')),
      decipher.final()
    ]);
    
    const decrypted = decryptedBuffer.toString('utf8');
    console.log('Decrypted Flow:', decrypted);
    
    return JSON.parse(decrypted);
  }

  encryptResponse(response: any, encryptedAesKey: string, initialVector: string): any {
    const privateKey = this.privateKey.replace(/\\n/g, '\n');
    const aesKey = crypto.privateDecrypt(
      { 
        key: privateKey, 
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(encryptedAesKey, 'base64')
    );
    const iv = Buffer.from(initialVector, 'base64');
    const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, iv);
    
    const encryptedBuffer = Buffer.concat([
      cipher.update(JSON.stringify(response), 'utf8'),
      cipher.final()
    ]);
    
    return { encrypted_flow_data: encryptedBuffer.toString('base64') };
  }

  async processFlow(decryptedData: any): Promise<any> {
    const { screen, data, version, action } = decryptedData;

    if (action === 'ping') {
      return { version, data: { status: 'active' } };
    }

    return {
      version,
      screen,
      data: {}
    };
  }
}
