import { Controller, Post, Get, Body, Req, Res, HttpStatus } from '@nestjs/common';
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
  async handleFlow(@Body() body: any) {
    try {
      console.log('Raw body keys:', Object.keys(body));
      console.log('encrypted_flow_data length:', body.encrypted_flow_data?.length);
      console.log('encrypted_flow_data sample:', body.encrypted_flow_data?.substring(0, 50));
      
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
