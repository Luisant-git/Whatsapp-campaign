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
        // INIT: Use SAME IV from request, NO IV prepending
        console.log('INIT response - using request IV, no prepending');
        console.log('INIT JSON EXACT:', responseString);
        console.log('Length:', Buffer.byteLength(responseString));
        
        const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, iv);
        cipher.setAutoPadding(true);
        
        let encrypted = cipher.update(responseString, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        console.log('Response encrypted length:', encrypted.length);
        console.log('Final buffer length:', encrypted.length);
        console.log('Modulo 16:', encrypted.length % 16);
        
        const encryptedBase64 = encrypted.toString('base64');
        console.log('Sending INIT response:', encryptedBase64);
        
        const finalResponse = { encrypted_flow_data: encryptedBase64 };
        console.log('FINAL RESPONSE BODY:', finalResponse);
        
        return finalResponse;
      } else {
        // Real flow data: Generate NEW IV and prepend it
        console.log('Real flow response - generating new IV and prepending');
        const responseIV = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, responseIV);
        cipher.setAutoPadding(true);
        
        let encrypted = cipher.update(responseString, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        const finalBuffer = Buffer.concat([responseIV, encrypted]);
        
        console.log('Response encrypted length:', encrypted.length);
        console.log('Final buffer length (IV + encrypted):', finalBuffer.length);
        console.log('Modulo 16:', finalBuffer.length % 16);
        
        const encryptedBase64 = finalBuffer.toString('base64');
        console.log('Sending flow response:', encryptedBase64);
        
        const finalResponse = { encrypted_flow_data: encryptedBase64 };
        console.log('FINAL RESPONSE BODY:', finalResponse);
        
        return finalResponse;
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
          
          // Generate NEW IV for response
          const responseIV = crypto.randomBytes(16);
          
          const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, responseIV);
          cipher.setAutoPadding(true);
          
          let encrypted = cipher.update(errorPayload, 'utf8');
          encrypted = Buffer.concat([encrypted, cipher.final()]);
          
          const finalBuffer = Buffer.concat([responseIV, encrypted]);
          const encryptedBase64 = finalBuffer.toString('base64');
          
          return { encrypted_flow_data: encryptedBase64 };
        }
      } catch (encryptError) {
        console.error('Failed to encrypt error response:', encryptError.message);
      }
      
      return { error: 'Internal server error' };
    }
  }
}