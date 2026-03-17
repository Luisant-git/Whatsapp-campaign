import { Controller, Post, Get, HttpCode, Req } from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { MetaFlowService } from './meta-flow.service';

@Controller('meta/flows')
export class MetaFlowController {
  constructor(private readonly metaFlowService: MetaFlowService) {}

  @Get()
  healthCheck() {
    return { 
      status: 'ok', 
      message: 'Meta Flow endpoint is ready',
      endpoint: '/meta/flows',
      timestamp: new Date().toISOString()
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'Meta Flow API is working',
      endpoint: '/meta/flows',
      timestamp: new Date().toISOString()
    };
  }

  @Post()
  @HttpCode(200)
  async handleFlow(@Req() req: any) {
    try {
      const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;

      const { data, aesKey, iv } = this.metaFlowService.decryptRequest(
        body.encrypted_flow_data || '',
        body.encrypted_aes_key || '',
        body.initial_vector || ''
      );

      const response = await this.metaFlowService.processFlow(data);
      
      // Encrypt response using flipped IV (as per WhatsApp Flows spec)
      const flippedIV = Buffer.from(iv.map(byte => byte ^ 0xFF));
      const algorithm = aesKey.length === 16 ? 'aes-128-gcm' : 'aes-256-gcm';
      const cipher = crypto.createCipheriv(algorithm, aesKey, flippedIV);
      
      const responseString = JSON.stringify(response);
      let encrypted = cipher.update(responseString, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const authTag = cipher.getAuthTag();
      const finalEncrypted = Buffer.concat([encrypted, authTag]);
      
      return finalEncrypted.toString('base64');
      
    } catch (error) {
      console.error('Flow error:', error.message);
      console.error('Stack:', error.stack);
      
      // Return unencrypted error for debugging
      return {
        screen: 'APPOINTMENT',
        data: {
          error_message: error.message
        }
      };
    }
  }
}