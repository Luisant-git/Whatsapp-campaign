import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class MetaFlowService {
  private readonly privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5F/pwR8Gjg/7m
Za8DoTZCWCJW8f+A8DEYZXlx4VD7bNm0QlqrtoGORvee4FSJ9Xy0WFa+ghBt7mLC
ygWCS1YblfhuvzKcu0OaYVDfKdVPdaMXne9vyHX/9fwP74ANM3nVFIipHNYkW3kW
OcNJfIPQ27INl7h4Us5Uau5Rd36t9hUoWAUo0+o9NeVFoYmBSSkX0QhinTge9HrR
dLwZI/jjQ7Tin8a2TwzP9JwUytLiVrSlz5zBoijhSwkeGK31kbAz+Rz4dXTZF/Z+
aRME5mLqa2bussyBcDXA0FPDEmiOFyqeEwR0fBLCcHugA5EKjDZTuyB3C/yoKFfv
ye0vXlDbAgMBAAECggEAWT/fqZ5gF6mBErV7Q4PLtwfqXwRHkHPBKKNdgPUFaIbf
HtVUBTJ2nBVKN1iySueNXySthyUOKQPmqUhiiaYr+hdBeJ1HGV4OxfUg2srAKZVu
s+ea2crOY0LIbSKuGy90ErPZBbp644McCwSFTvz0TpRw8a7z60j6Zqg9DBlTgyuw
TSjOuyQYpM8vHubUhzHPUXGBmvbaTAUego4HWlKBB6altIBpkzl381J39hloM4q0
SJoTbEzEnKOfcKGkPGLLwgA1pfrwI1B2Ng2HGetS8ozxd4GtWkuM7xq8R0i3Fp71
d/qe6s9X1h1YM3oJA7SZMohrXDPNbsPVClwH7kWG0QKBgQDnWk5XHdrcVQ/nlAEj
IMdIO4dFjpU6jk6zLzy6WUIKrZ5So7+dHJihb4dD84jmwQl+FSB646x69Qd2C8mi
FTSZGh7pHi2pxFE9mnIQpbVcSCnEbQPLwKju6Z2uObtS0KGCxEJfR5ct4STgz/c9
bGyJar3ZKEZpQSSqQRYZZ76bowKBgQDM0AvFU1lDfurtVlQeCOZ4+JpCqIqRjBVV
o48mb6jOtBbV5Pg88tbrVXR4iZZhjfxLJ8wkTWltZSMhGr3Dkx7Iwf0zpgpWi8yu
KRvusu+xPfmRbQ6pKkdV610qbN+PQrZ0dWLWPVyCIhXy/l4ot4HgbGH7qd3Gxj9o
pOIppeVJaQKBgQCkmTBxdLE432AQb9GbT3/ZGVk1mKr9XTAK9gmrv0NoW3vv6caz
HhxNhw7ivorhOefqB1fzdrZJSLmFN/+9zH5+iwIA81KjnSP7wz1yMKNmw4TL1o/D
0A+g4x8nTLXExuCSK9XY+hNKNgvJ0sxhrBlQb1wg+zGVQx617tatPo1zJwKBgAcD
SKPlCrVo7xpZTmAI5ftWZ9HIe5YoOcLI6uniAOGzAOUqBeXwWrOMJYTLET8d4Xmh
Tzge/nEkeWN0yvKbYv50xfqywL/d4ZBFEBPIRLTI7nawSUQ5kl+6w2HkgHMjUaQD
MPMs/rHmAOJlG0xBnEzW6TP4yQM5Xopyutu6NnOhAoGBAN8mDMf7/l8fxmgVkktj
yIi9A812mrIDGD/99TdTh3jB6XuT+fwpjGmEzS5XOYzCaApcE0DNvoP14OmBEBxM
gsRhe4Go8yYVnn9wgRqFpNkYonQ/zahl5cwydhiq1sVErgC5imJa4tiKwMCFzmxR
MmOROPXhnwClx8SPS7hKY+fG
-----END PRIVATE KEY-----`;
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
    console.log('Encrypted Data Length:', encryptedFlowData.length);
    
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
