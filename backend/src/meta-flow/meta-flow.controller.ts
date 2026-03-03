import { Controller, Post, Get, Body, HttpCode } from '@nestjs/common';
import type { Request, Response } from 'express';
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
  async handleFlow(@Body() body: any) {
    try {
      console.log('=== META FLOW REQUEST ===');
      console.log('Body keys:', Object.keys(body));
      console.log('encrypted_flow_data length:', body.encrypted_flow_data?.length);
      console.log('encrypted_flow_data:', body.encrypted_flow_data);
      console.log('encrypted_aes_key length:', body.encrypted_aes_key?.length);
      console.log('initial_vector length:', body.initial_vector?.length);
      
      if (!body.encrypted_flow_data) {
        return { status: 'active' };
      }

      const { data, aesKey, iv } = this.metaFlowService.decryptRequest(
        body.encrypted_flow_data,
        body.encrypted_aes_key,
        body.initial_vector
      );

      const response = await this.metaFlowService.processFlow(data);
      return this.metaFlowService.encryptResponse(response, aesKey, iv);
    } catch (error) {
      console.error('Flow error:', error.message);
      return { version: '3.0', data: { error: error.message } };
    }
  }
}
