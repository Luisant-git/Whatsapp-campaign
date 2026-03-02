import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class MetaFlowService {
  private readonly privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAuRf6cEfBo4P+5mWvA6E2QlgiVvH/gPAxGGV5ceFQ+2zZtEJa
q7aBjkb3nuBUifV8tFhWvoIQbe5iwsoFgktWG5X4br8ynLtDmmFQ3ynVT3WjF53v
b8h1//X8D++ADTN51RSIqRzWJFt5FjnDSXyD0NuyDZe4eFLOVGruUXd+rfYVKFgF
KNPqPTXlRaGJgUkpF9EIYp04HvR60XS8GSP440O04p/Gtk8Mz/ScFMrS4la0pc+c
waIo4UsJHhit9ZGwM/kc+HV02Rf2fmkTBOZi6mtm7rLMgXA1wNBTwxJojhcqnhME
dHwSwnB7oAORCow2U7sgdwv8qChX78ntL15Q2wIDAQABAoIBAFk/36meYBepgRK1
e0ODy7cH6l8ER5BzwSijXYD1BWiG3x7VVAUydpwVSjdYskrnjV8krYclDikD5qlI
YommK/oXQXidRxleDsX1INrKwCmVbrPnmtnKzmNCyG0irhsvdBKz2QW6euODHAsE
hU789E6UcPGu8+tI+maoPQwZU4MrsE0ozrskGKTPLx7m1Icxz1FxgZr22kwFHoKO
B1pSgQempbSAaZM5d/NSd/YZaDOKtEiaE2xMxJyjn3ChpDxiy8IANaX68CNQdjYN
hxnrUvKM8XeBrVpLjO8avEdItxae9Xf6nurPV9YdWDN6CQO0mTKIa1wzzW7D1Qpc
B+5FhtECgYEA51pOVx3a3FUP55QBIyDHSDuHRY6VOo5Osy88ullCCq2eUqO/nRyY
oW+HQ/OI5sEJfhUgeuOsevUHdgvJohU0mRoe6R4tqcRRPZpyEKW1XEgpxG0Dy8Co
7umdrjm7UtChgsRCX0eXLeEk4M/3PWxsiWq92ShGaUEkqkEWGWe+m6MCgYEAzNAL
xVNZQ37q7VZUHgjmePiaQqiKkYwVVaOPJm+ozrQW1eT4PPLW61V0eImWYY38SyfM
JE1pbWUjIRq9w5MeyMH9M6YKVovMrikb7rLvsT35kW0OqSpHVetdKmzfj0K2dHVi
1j1cgiIV8v5eKLeB4Gxh+6ndxsY/aKTiKaXlSWkCgYEApJkwcXSxON9gEG/Rm09/
2RlZNZiq/V0wCvYJq79DaFt77+nGsx4cTYcO4r6K4Tnn6gdX83a2SUi5hTf/vcx+
fosCAPNSo50j+8M9cjCjZsOEy9aPw9APoOMfJ0y1xMbgkivV2PoTSjYLydLMYawZ
UG9cIPsxlUMete7WrT6NcycCgYAHA0ij5Qq1aO8aWU5gCOX7VmfRyHuWKDnCyOrp
4gDhswDlKgXl8FqzjCWEyxE/HeF5oU84Hv5xJHljdMrym2L+dMX6ssC/3eGQRRAT
yES0yO52sElEOZJfusNh5IBzI1GkAzDzLP6x5gDiZRtMQZxM1ukz+MkDOV6Kcrrb
ujZzoQKBgQDfJgzH+/5fH8ZoFZJLY8iIvQPNdpqyAxg//fU3U4d4wel7k/n8KYxp
hM0uVzmMwmgKXBNAzb6D9eDpgRAcTILEYXuBqPMmFZ5/cIEahaTZGKJ0P82oZeXM
MnYYqtbFRK4AuYpiWuLYisDAhc5sUTJjkTj14Z8ApcfEj0u4SmPnxg==
-----END RSA PRIVATE KEY-----`;
  private readonly appSecret = process.env.META_APP_SECRET || '';

  verifySignature(payload: string, signature: string): boolean {
    if (!signature || !this.appSecret) return false;
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', this.appSecret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  decryptRequest(encryptedFlowData: string, encryptedAesKey: string, initialVector: string): any {
    const aesKey = crypto.privateDecrypt(
      { 
        key: this.privateKey, 
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
    const aesKey = crypto.privateDecrypt(
      { 
        key: this.privateKey, 
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
