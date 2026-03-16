import { Controller, Post, Get, HttpCode, Req, Res, HttpStatus } from '@nestjs/common';
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
  async handleFlow(@Req() req: Request, @Res() res: Response) {
    try {
      // Verify request signature if app secret is configured
      const signature = req.headers['x-hub-signature-256'] as string;
      const rawBody = JSON.stringify(req.body);
      
      if (process.env.META_APP_SECRET && !this.metaFlowService.verifySignature(rawBody, signature)) {
        console.error('Invalid signature');
        return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
      }

      const body = req.body;
      
      // Handle missing required fields
      if (!body.encrypted_aes_key || !body.initial_vector) {
        console.error('Missing required encryption fields');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing encryption fields' });
      }

      let decryptedData;
      let aesKey: Buffer;
      let iv: Buffer;

      try {
        const decryptResult = this.metaFlowService.decryptRequest(
          body.encrypted_flow_data || '',
          body.encrypted_aes_key,
          body.initial_vector
        );
        
        decryptedData = decryptResult.data;
        aesKey = decryptResult.aesKey;
        iv = decryptResult.iv;
      } catch (decryptError) {
        console.error('Decryption failed:', decryptError.message);
        // Return HTTP 421 for decryption errors as per Meta specification
        return res.status(421).json({ error: 'Decryption failed' });
      }

      // Validate flow token signature if present
      if (decryptedData.flow_token_signature && decryptedData.flow_token) {
        const isValidToken = this.metaFlowService.validateFlowTokenSignature(
          decryptedData.flow_token_signature,
          decryptedData.flow_token
        );
        
        if (!isValidToken) {
          console.warn('Invalid flow token signature');
        }
      }

      let response;
      
      // Handle different types of requests
      if (decryptedData.action === 'ping') {
        // Health check
        response = await this.metaFlowService.processFlow(decryptedData);
      } else if (decryptedData.data?.error) {
        // Error notification
        response = await this.metaFlowService.handleErrorNotification(decryptedData);
      } else {
        // Data exchange
        response = await this.metaFlowService.processFlow(decryptedData);
      }

      // Encrypt and return response
      const encryptedResponse = this.metaFlowService.encryptResponse(response, aesKey, iv);
      
      // Return as plain text as per Meta specification
      res.setHeader('Content-Type', 'text/plain');
      return res.send(encryptedResponse);
      
    } catch (error) {
      console.error('Flow processing error:', error.message);
      console.error('Stack:', error.stack);
      
      // Try to return encrypted error response if possible
      try {
        const body = req.body;
        if (body.encrypted_aes_key && body.initial_vector) {
          const { aesKey, iv } = this.metaFlowService.decryptRequest(
            '',
            body.encrypted_aes_key,
            body.initial_vector
          );
          
          const errorResponse = {
            data: {
              error: 'Internal server error'
            }
          };
          
          const encryptedError = this.metaFlowService.encryptResponse(errorResponse, aesKey, iv);
          res.setHeader('Content-Type', 'text/plain');
          return res.send(encryptedError);
        }
      } catch (encryptError) {
        console.error('Failed to encrypt error response:', encryptError.message);
      }
      
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        error: 'Internal server error' 
      });
    }
  }
}