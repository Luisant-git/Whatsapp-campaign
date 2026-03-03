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
      
      // Parse raw body to preserve base64 integrity
      const body = JSON.parse(req.body.toString());
      console.log('Body keys:', Object.keys(body));
      
      // Health check - MUST still encrypt response
      if (!body.encrypted_flow_data || !body.encrypted_aes_key || !body.initial_vector) {
        console.log('Not valid AES block size. This is likely a Flow INIT/health-check call.');
        
        // For INIT, we still need to decrypt the AES key and encrypt response
        const { aesKey, iv } = this.metaFlowService.decryptRequest(
          '', // No flow data for INIT
          body.encrypted_aes_key?.replace(/ /g, '+') || '',
          body.initial_vector?.replace(/ /g, '+') || ''
        );
        
        const responsePayload = JSON.stringify({
          version: '1.0',
          data: {}
        });
        
        console.log('JSON payload before encryption:', responsePayload);
        console.log('Payload length:', Buffer.byteLength(responsePayload));
        console.log('Expected length should be 29 bytes for correct structure');
        
        // CRITICAL: Use ZERO IV for response encryption
        const zeroIv = Buffer.alloc(16, 0);
        
        const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, zeroIv);
        let encrypted = cipher.update(responsePayload, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        console.log('Response encrypted length:', encrypted.length);
        console.log('Modulo 16:', encrypted.length % 16);
        
        const encryptedBase64 = encrypted.toString('base64');
        console.log('Sending response:', encryptedBase64);
        
        return res
          .status(200)
          .set('Content-Type', 'text/plain')
          .send(encryptedBase64);
      }

      console.log('encrypted_flow_data length:', body.encrypted_flow_data?.length);
      console.log('encrypted_aes_key length:', body.encrypted_aes_key?.length);
      console.log('initial_vector length:', body.initial_vector?.length);
      
      // Log raw string to check for corruption
      console.log('Encrypted string:', body.encrypted_flow_data);
      
      // Normalize base64 string (fix + to space conversion)
      const normalizedFlowData = body.encrypted_flow_data.replace(/ /g, '+');
      const normalizedAesKey = body.encrypted_aes_key.replace(/ /g, '+');
      const normalizedIV = body.initial_vector.replace(/ /g, '+');
      
      // Check buffer integrity
      const encryptedBuffer = Buffer.from(normalizedFlowData, 'base64');
      console.log('Encrypted Buffer Length:', encryptedBuffer.length);
      console.log('Modulo 16:', encryptedBuffer.length % 16);

      const { data, aesKey, iv } = this.metaFlowService.decryptRequest(
        normalizedFlowData,
        normalizedAesKey,
        normalizedIV
      );

      const response = await this.metaFlowService.processFlow(data);
      
      // Encrypt response using SAME AES key + ZERO IV
      const responseString = JSON.stringify(response);
      
      // CRITICAL: Use ZERO IV for response encryption
      const zeroIv = Buffer.alloc(16, 0);
      
      const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, zeroIv);
      let encrypted = cipher.update(responseString, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      console.log('Response encrypted length:', encrypted.length);
      console.log('Modulo 16:', encrypted.length % 16);
      
      const encryptedBase64 = encrypted.toString('base64');
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
          
          console.log('Error JSON payload before encryption:', errorPayload);
          
          // CRITICAL: Use ZERO IV for response encryption
          const zeroIv = Buffer.alloc(16, 0);
          
          const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, zeroIv);
          let encrypted = cipher.update(errorPayload, 'utf8');
          encrypted = Buffer.concat([encrypted, cipher.final()]);
          
          const encryptedBase64 = encrypted.toString('base64');
          
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
