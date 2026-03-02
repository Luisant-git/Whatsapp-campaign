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
    const decipher = crypto.createDecipheriv('aes-128-cbc', aesKey, Buffer.from(initialVector, 'base64'));
    let decrypted = decipher.update(encryptedFlowData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
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
    const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, Buffer.from(initialVector, 'base64'));
    let encrypted = cipher.update(JSON.stringify(response), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return { encrypted_flow_data: encrypted };
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
