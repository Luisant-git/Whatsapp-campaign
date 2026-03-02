import { Controller, Post, Body, Req, Res, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MetaFlowService } from './meta-flow.service';

@Controller('meta/flows')
export class MetaFlowController {
  constructor(private readonly metaFlowService: MetaFlowService) {}

  @Post()
  async handleFlow(@Req() req: Request, @Res() res: Response, @Body() body: any) {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      
      if (!this.metaFlowService.verifySignature(JSON.stringify(body), signature)) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
      }

      const decryptedData = this.metaFlowService.decryptRequest(body.encrypted_flow_data, body.encrypted_aes_key, body.initial_vector);
      const response = await this.metaFlowService.processFlow(decryptedData);
      const encryptedResponse = this.metaFlowService.encryptResponse(response, body.encrypted_aes_key, body.initial_vector);

      return res.status(HttpStatus.OK).json(encryptedResponse);
    } catch (error) {
      return res.status(HttpStatus.OK).json({ version: '3.0', data: { error: error.message } });
    }
  }
}
