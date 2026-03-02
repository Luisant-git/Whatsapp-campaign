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
    const aesKey = crypto.privateDecrypt(
      { key: this.privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      Buffer.from(encryptedAesKey, 'base64')
    );
    const decipher = crypto.createDecipheriv('aes-128-gcm', aesKey, Buffer.from(initialVector, 'base64'));
    const encryptedBuffer = Buffer.from(encryptedFlowData, 'base64');
    const tag = encryptedBuffer.slice(-16);
    const encrypted = encryptedBuffer.slice(0, -16);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf-8'));
  }

  encryptResponse(response: any, encryptedAesKey: string, initialVector: string): any {
    const aesKey = crypto.privateDecrypt(
      { key: this.privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      Buffer.from(encryptedAesKey, 'base64')
    );
    const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, Buffer.from(initialVector, 'base64'));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(response), 'utf-8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { encrypted_flow_data: Buffer.concat([encrypted, tag]).toString('base64') };
  }

  async processFlow(decryptedData: any): Promise<any> {
    const { screen, data, version, action } = decryptedData;

    // Handle different screens and actions
    if (action === 'ping') {
      return { version, data: { status: 'active' } };
    }

    // Add your flow logic here based on screen
    return {
      version,
      screen,
      data: {
        // Your response data
      }
    };
  }
}
