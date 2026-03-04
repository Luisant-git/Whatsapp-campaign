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
      const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;

      const { data, aesKey, iv, isInit } = this.metaFlowService.decryptRequest(
        body.encrypted_flow_data || '',
        body.encrypted_aes_key || '',
        body.initial_vector || ''
      );

      const response = await this.metaFlowService.processFlow(data);
      const responseString = JSON.stringify(response);
      
      if (isInit) {
        const algorithm = aesKey.length === 16 ? 'aes-128-gcm' : 'aes-256-gcm';
        const cipher = crypto.createCipheriv(algorithm, aesKey, iv);
        
        let encrypted = cipher.update(responseString, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();
        const finalEncrypted = Buffer.concat([encrypted, authTag]);
        
        return finalEncrypted.toString('base64');
      } else {
        const flippedIV = Buffer.from(iv.map(byte => byte ^ 0xFF));
        const algorithm = aesKey.length === 16 ? 'aes-128-gcm' : 'aes-256-gcm';
        const cipher = crypto.createCipheriv(algorithm, aesKey, flippedIV);
        
        let encrypted = cipher.update(responseString, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();
        const finalEncrypted = Buffer.concat([encrypted, authTag]);
        
        return finalEncrypted.toString('base64');
      }
    } catch (error) {
      console.error('Flow error:', error.message);
      
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