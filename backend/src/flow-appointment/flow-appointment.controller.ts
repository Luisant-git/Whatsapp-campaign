import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { FlowAppointmentService } from './flow-appointment.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('flow-appointments')
export class FlowAppointmentController {
  constructor(private readonly flowAppointmentService: FlowAppointmentService) {}

  @Get()
  @UseGuards(SessionGuard)
  async getAppointments(@Req() req: any) {
    const userId = req.session.userId || req.session.user?.id;
    return this.flowAppointmentService.getAppointments(userId);
  }

  @Post('webhook')
  async handleFlowResponse(@Body() body: any) {
    console.log('Flow webhook received:', JSON.stringify(body, null, 2));
    
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const message = change.value.messages?.[0];
            if (message?.type === 'interactive' && message.interactive?.type === 'nfm_reply') {
              const responseData = JSON.parse(message.interactive.nfm_reply.response_json);
              const phoneNumberId = change.value.metadata?.phone_number_id;
              
              await this.flowAppointmentService.saveAppointmentFromWebhook(
                responseData,
                message.from,
                phoneNumberId
              );
            }
          }
        }
      }
    }
    
    return 'EVENT_RECEIVED';
  }
}
