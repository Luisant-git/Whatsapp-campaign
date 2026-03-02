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
  async handleFlow(@Req() req: Request, @Res() res: Response, @Body() body: any) {
    try {
      // Handle health check/ping requests
      if (!body.encrypted_flow_data) {
        return res.status(HttpStatus.OK).json({ status: 'active', message: 'Flow endpoint ready' });
      }

      // For small payloads, try to decrypt and respond
      if (body.encrypted_flow_data.length < 100) {
        console.log('Small payload detected, encrypting simple response');
        const simpleResponse = { data: { status: 'active', acknowledged: true } };
        const encryptedResponse = this.metaFlowService.encryptResponse(simpleResponse, body.encrypted_aes_key, body.initial_vector);
        return res.status(HttpStatus.OK).json(encryptedResponse);
      }

      const decryptedData = this.metaFlowService.decryptRequest(body.encrypted_flow_data, body.encrypted_aes_key, body.initial_vector);
      const response = await this.metaFlowService.processFlow(decryptedData);
      const encryptedResponse = this.metaFlowService.encryptResponse(response, body.encrypted_aes_key, body.initial_vector);

      return res.status(HttpStatus.OK).json(encryptedResponse);
    } catch (error) {
      console.error('Flow error:', error.message);
      return res.status(HttpStatus.OK).json({ version: '3.0', data: { error: error.message } });
    }
  }
}
