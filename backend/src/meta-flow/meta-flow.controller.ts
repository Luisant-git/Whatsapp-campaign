import { Controller, Post, Get, HttpCode, Req } from '@nestjs/common';
import type { Request } from 'express';
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
  async handleFlow(@Req() req: any) {
    try {
      console.log('=== META FLOW REQUEST ===');
      console.log('Is Buffer:', Buffer.isBuffer(req.body));
      console.log('Original URL:', req.originalUrl);
      
      // Handle body parsing correctly - use parsed JSON directly
      const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
      console.log('Body keys:', Object.keys(body));
      console.log('Raw encrypted_flow_data length:', body.encrypted_flow_data?.length);
      
      // Always try to decrypt the flow data - even for INIT
      console.log('encrypted_flow_data length:', body.encrypted_flow_data?.length);
      console.log('encrypted_aes_key length:', body.encrypted_aes_key?.length);
      console.log('initial_vector length:', body.initial_vector?.length);
      
      // DO NOT modify base64 strings - use them directly
      const encryptedBuffer = Buffer.from(body.encrypted_flow_data || '', 'base64');
      console.log('Encrypted Buffer Length:', encryptedBuffer.length);
      console.log('Modulo 16:', encryptedBuffer.length % 16);

      const { data, aesKey, iv, isInit } = this.metaFlowService.decryptRequest(
        body.encrypted_flow_data || '',
        body.encrypted_aes_key || '',
        body.initial_vector || ''
      );

      console.log('Decrypted data:', data);
      const response = await this.metaFlowService.processFlow(data);
      
      // Encrypt response - different logic for INIT vs real flow data
      const responseString = JSON.stringify(response);
      
      if (isInit) {
        // INIT: Use SAME IV from request (NOT flipped)
        console.log('INIT response - using original IV');
        console.log('INIT JSON EXACT:', responseString);
        
        const algorithm = aesKey.length === 16 ? 'aes-128-gcm' : 'aes-256-gcm';
        const cipher = crypto.createCipheriv(algorithm, aesKey, iv);
        
        let encrypted = cipher.update(responseString, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();
        const finalEncrypted = Buffer.concat([encrypted, authTag]);
        
        console.log('Response encrypted length:', finalEncrypted.length);
        console.log('Modulo 16:', finalEncrypted.length % 16);
        
        return finalEncrypted.toString('base64');
      } else {
        // Real flow data: Use flipped IV for AES-GCM
        console.log('Real flow response - using flipped IV');
        
        const flippedIV = Buffer.from(iv.map(byte => byte ^ 0xFF));
        const algorithm = aesKey.length === 16 ? 'aes-128-gcm' : 'aes-256-gcm';
        const cipher = crypto.createCipheriv(algorithm, aesKey, flippedIV);
        
        let encrypted = cipher.update(responseString, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();
        const finalEncrypted = Buffer.concat([encrypted, authTag]);
        
        console.log('Response encrypted length:', finalEncrypted.length);
        console.log('Modulo 16:', finalEncrypted.length % 16);
        
        return finalEncrypted.toString('base64');
      }
    } catch (error) {
      console.error('Flow error:', error.message);
      
      // Even errors should be encrypted if we have keys
      try {
        const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
        if (body.encrypted_aes_key && body.initial_vector) {
          const { aesKey, iv } = this.metaFlowService.decryptRequest(
            '',
            body.encrypted_aes_key,
            body.initial_vector
          );
          
          const errorPayload = JSON.stringify({
            version: '1.0',
            data: { error: error.message }
          });
          
          // Use flipped IV for error response
          const flippedIV = Buffer.from(iv.map(byte => byte ^ 0xFF));
          
          const algorithm = aesKey.length === 16 ? 'aes-128-gcm' : 'aes-256-gcm';
          const cipher = crypto.createCipheriv(algorithm, aesKey, flippedIV);
          
          let encrypted = cipher.update(errorPayload, 'utf8');
          encrypted = Buffer.concat([encrypted, cipher.final()]);
          
          const authTag = cipher.getAuthTag();
          const finalEncrypted = Buffer.concat([encrypted, authTag]);
          const encryptedBase64 = finalEncrypted.toString('base64');
          
          return encryptedBase64;
        }
      } catch (encryptError) {
        console.error('Failed to encrypt error response:', encryptError.message);
      }
      
      return { error: 'Internal server error' };
    }
  }
}