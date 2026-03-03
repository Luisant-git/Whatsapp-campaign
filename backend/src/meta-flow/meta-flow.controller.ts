import { Controller, Post, Get, Body, HttpCode, Res } from '@nestjs/common';
import type { Response } from 'express';
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
  async handleFlow(@Body() body: any, @Res() res: Response) {
    try {
      console.log('=== META FLOW REQUEST ===');
      console.log('Body keys:', Object.keys(body));
      
      // Health check - no encryption
      if (!body.encrypted_flow_data || !body.encrypted_aes_key || !body.initial_vector) {
        const response = { version: '3.0', data: { status: 'active' } };
        return res.send(Buffer.from(JSON.stringify(response)).toString('base64'));
      }

      console.log('encrypted_flow_data length:', body.encrypted_flow_data?.length);
      console.log('encrypted_aes_key length:', body.encrypted_aes_key?.length);
      console.log('initial_vector length:', body.initial_vector?.length);

      const { data, aesKey, iv } = this.metaFlowService.decryptRequest(
        body.encrypted_flow_data,
        body.encrypted_aes_key,
        body.initial_vector
      );

      const response = await this.metaFlowService.processFlow(data);
      
      // Encrypt response using SAME AES key + IV
      const responseString = JSON.stringify(response);
      const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, iv);
      
      let encrypted = cipher.update(responseString, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      return res.send(encrypted.toString('base64'));
    } catch (error) {
      console.error('Flow error:', error.message);
      const errorResponse = { version: '3.0', data: { error: error.message } };
      return res.send(Buffer.from(JSON.stringify(errorResponse)).toString('base64'));
    }
  }
}
