import { Controller, Post, Get, HttpCode, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import * as crypto from 'crypto';
import { MetaFlowService } from './meta-flow.service';

@Controller('meta/flows')
export class MetaFlowController {
  constructor(private readonly metaFlowService: MetaFlowService) {}

  @Get()
  healthCheck() {
    return { status: 'active', message: 'Meta Flow endpoint is ready' };
  }

  @Post()
  @HttpCode(200)
  async handleFlow(@Req() req: any, @Res() res: Response) {
    try {
      console.log('=== META FLOW REQUEST ===');
      console.log('Is Buffer:', Buffer.isBuffer(req.body));
      console.log('Original URL:', req.originalUrl);
      
      // Handle body parsing correctly - avoid double parsing
      const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
      console.log('Body keys:', Object.keys(body));
      console.log('Raw encrypted_flow_data:', body.encrypted_flow_data);
      
      // Always try to decrypt the flow data - even for INIT
      console.log('encrypted_flow_data length:', body.encrypted_flow_data?.length);
      console.log('encrypted_aes_key length:', body.encrypted_aes_key?.length);
      console.log('initial_vector length:', body.initial_vector?.length);
      
      // Normalize base64 string (fix + to space conversion)
      const normalizedFlowData = body.encrypted_flow_data?.replace(/ /g, '+') || '';
      const normalizedAesKey = body.encrypted_aes_key?.replace(/ /g, '+') || '';
      const normalizedIV = body.initial_vector?.replace(/ /g, '+') || '';
      
      // Check buffer integrity
      const encryptedBuffer = Buffer.from(normalizedFlowData, 'base64');
      console.log('Encrypted Buffer Length:', encryptedBuffer.length);
      console.log('Modulo 16:', encryptedBuffer.length % 16);

      const { data, aesKey, iv } = this.metaFlowService.decryptRequest(
        normalizedFlowData,
        normalizedAesKey,
        normalizedIV
      );

      console.log('Decrypted data:', data);
      const response = await this.metaFlowService.processFlow(data);
      
      // Encrypt response using SAME AES key + SAME IV from request
      const responseString = JSON.stringify(response);
      
      // 1️⃣ Generate NEW IV for response
      const responseIV = crypto.randomBytes(16);
      
      // 2️⃣ Encrypt using NEW IV
      const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, responseIV);
      cipher.setAutoPadding(true);
      
      let encrypted = cipher.update(responseString, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // 3️⃣ Prepend IV to encrypted data
      const finalBuffer = Buffer.concat([responseIV, encrypted]);
      
      console.log('Response encrypted length:', encrypted.length);
      console.log('Final buffer length (IV + encrypted):', finalBuffer.length);
      console.log('Modulo 16:', finalBuffer.length % 16);
      
      // 4️⃣ Base64 encode IV + ciphertext
      const encryptedBase64 = finalBuffer.toString('base64');
      console.log('Sending response:', encryptedBase64);
      
      return res
        .status(200)
        .set('Content-Type', 'text/plain')
        .send(encryptedBase64);
    } catch (error) {
      console.error('Flow error:', error.message);
      
      // Even errors should be encrypted if we have keys
      try {
        const body = JSON.parse(req.body.toString());
        if (body.encrypted_aes_key && body.initial_vector) {
          const { aesKey, iv } = this.metaFlowService.decryptRequest(
            '',
            body.encrypted_aes_key.replace(/ /g, '+'),
            body.initial_vector.replace(/ /g, '+')
          );
          
          const errorPayload = JSON.stringify({
            version: '1.0',
            data: { error: error.message }
          });
          
          // 1️⃣ Generate NEW IV for response
          const responseIV = crypto.randomBytes(16);
          
          // 2️⃣ Encrypt using NEW IV
          const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, responseIV);
          cipher.setAutoPadding(true);
          
          let encrypted = cipher.update(errorPayload, 'utf8');
          encrypted = Buffer.concat([encrypted, cipher.final()]);
          
          // 3️⃣ Prepend IV to encrypted data
          const finalBuffer = Buffer.concat([responseIV, encrypted]);
          
          // 4️⃣ Base64 encode IV + ciphertext
          const encryptedBase64 = finalBuffer.toString('base64');
          
          return res
            .status(200)
            .set('Content-Type', 'text/plain')
            .send(encryptedBase64);
        }
      } catch (encryptError) {
        console.error('Failed to encrypt error response:', encryptError.message);
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
