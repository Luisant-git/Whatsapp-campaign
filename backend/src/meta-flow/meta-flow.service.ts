import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class MetaFlowService {
  private readonly privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDKJTPPy+WCQnZS
VVXw7E1kfijwdok+lwFrXKWnQv8TNRCb4XpJSzqFbTQTfqtK6dX5Kz7FoUcde5NT
tYm81JalFiKNIedgiZt+b5r7d4+lZjHJJkh5NL97KwMSBAkjbdaHorDjxdUcNVV7
KVoZzmMM0AxJj/MguNDQl8g5oNz4qUuAgygu+L63sE6na0Jdhfs1VXYcxgjjDIDI
nXBXjJU1IMkDD/Hvuhzt8lIZHmsjay48kXb2i/18Zeo8Nsq1LbyIE7RFQub3lZUx
pLUNN9q0F5kRaSGyaBsd5HfyMAdt3fdy0rHMZUvVTNGDKYVDTfMdUsNyBfT0a+Pv
nJPp8WZ5AgMBAAECggEAAzedLsHFzu8M02+HOQsY5XKJXikYhUaNBXbmLh1wzapm
2NLZdU7Z1Jt8LGRUBA47OjZneBaClJU0nPFUKtr59r5rSGS3J+yydgxISY6MCGOt
jFlcQfaWb8195JuHXw/ke5rC7cjUSZkOWaQouCWIh6VoGhX6xCUlccwqoLm/CgOV
z1vwqXD60aJeIJdSRjem3suyGPSXfKulWDDe3N3Rme1C3/xBTD3H7eARtKQjypjs
bhX13iax9q/xkbXFXfWvJ3UEwJO8znVS6FRWyKEd2gyOdIHzsWPtcMmiiXGh8Ubv
1XA2z1e/i+p/qVcjXWq7NASSAORY+/eY2zQPPzozgQKBgQDmTttKvJLtxn6Jp2I3
DcBiVnOlRZVn6foc4OZQxBWKly2wVzBdEx/RqNLcWAHYx+yVFhHfsz/LGaNdco6q
b1XRs8mBZpWs+jkRlAZRCUOMH+qspnBvcLovPCPLGiSS4sN2Ntnf6LFoUS2m6efO
2Iws4RTOIVQR7s9HQ62G2e3T+QKBgQDgshMCTdmyle0lbRKnS/xcHeuaNA/Yz3Sw
/CSgQIDjfS/0m09NbIwoRCVcd4hglNjK6OCyiRqDIsgYzyFs+JgJizoIMY1loPV3
ELtswgyeRNXeQlBQoWCmxTB5P6Dpm0QYmK1PZaZSFlhTFiBOIAQ1haALBN3DF0fQ
d7HYXB/GgQKBgDRJjPHv1C/Vk97uuJalMZth40mPfbck4NrzmHaXvghEAGR7twg6
kkvIV28dL/YmlajXZOFz0bTrsjJCEu/Q7Rv6BHKzdqHaAWDjSXfWcZZ7nIzsELTM
VAjrT3kKC2mpwBSzqU1zh+uWGpY9nppQgaqiw1V1LaAQptCYJepqydsJAoGAVR+h
S/IqUxmxachUlMSYql07cIPgrQaK8rHTPlKxgX1fuY9ND8vbnTWT4d/27n/1UYm/
9mMyhBOdMqjlxN642oTAS3JaWvILjDvuhVlOZnc1fqoouyMn9oYlwwlz8Iw91AOj
RL0BsX99npx3SKGgdpZU91e0m8AqGLP/0DO2ZgECgYA/7JuW/5VtLJT0ipgufNxH
Kr7pKxH+qXzEQ8cFfRR/zvJmy7H6VuYvbgVLeD+8xBrx1pmSfJYjkKaGXfVZ15ak
zVCndBFdrZ+c3Q1B1IT8R5NZ8QqtRAfQtIifNSGtZg4ENafNm1QDB9FaNhj5kNcm
VZzqOlkRzxNWa/kCe2B6+w==
-----END PRIVATE KEY-----`;
  private readonly appSecret = process.env.META_APP_SECRET || '';

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
    const encryptedBuffer = Buffer.from(encryptedFlowData, 'base64');
    
    console.log('AES Key Length:', aesKey.length);
    console.log('IV Length:', iv.length);
    console.log('Encrypted Buffer Length:', encryptedBuffer.length);
    
    const decipher = crypto.createDecipheriv('aes-128-cbc', aesKey, iv);
    decipher.setAutoPadding(true);
    
    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);
    
    const decrypted = decryptedBuffer.toString('utf8');
    console.log('Decrypted Flow:', decrypted);
    
    return {
      data: JSON.parse(decrypted),
      aesKey,
      iv
    };
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
