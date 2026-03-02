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
      if (!body.encrypted_flow_data) {
        return res.status(HttpStatus.OK).json({ status: 'active', message: 'Flow endpoint ready' });
      }

      // Try to decrypt the request
      let decryptedData;
      try {
        decryptedData = this.metaFlowService.decryptRequest(body.encrypted_flow_data, body.encrypted_aes_key, body.initial_vector);
        console.log('Decrypted request:', JSON.stringify(decryptedData));
      } catch (decryptError) {
        console.error('Decryption failed:', decryptError.message);
        // If decryption fails, return simple encrypted response
        const simpleResponse = { data: { status: 'active' } };
        const encryptedResponse = this.metaFlowService.encryptResponse(simpleResponse, body.encrypted_aes_key, body.initial_vector);
        return res.status(HttpStatus.OK).send(encryptedResponse.encrypted_flow_data);
      }

      const response = await this.metaFlowService.processFlow(decryptedData);
      console.log('Response to encrypt:', JSON.stringify(response));
      const encryptedResponse = this.metaFlowService.encryptResponse(response, body.encrypted_aes_key, body.initial_vector);

      return res.status(HttpStatus.OK).send(encryptedResponse.encrypted_flow_data);
    } catch (error) {
      console.error('Flow error:', error.message);
      return res.status(HttpStatus.OK).json({ version: '3.0', data: { error: error.message } });
    }
  }
}
