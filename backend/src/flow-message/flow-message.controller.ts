import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { FlowMessageService, FlowMessageParams, FlowTemplateParams } from './flow-message.service';

export interface SendFlowMessageDto {
  to: string;
  flowId?: string;
  flowName?: string;
  flowCta: string;
  header?: string;
  body?: string;
  footer?: string;
  flowToken?: string;
  flowAction?: 'navigate' | 'data_exchange';
  flowActionPayload?: {
    screen?: string;
    data?: Record<string, any>;
  };
  mode?: 'draft' | 'published';
}

export interface SendFlowTemplateDto {
  templateName: string;
  to: string;
  languageCode: string;
  flowToken?: string;
  flowActionData?: Record<string, any>;
}

export interface CreateFlowTemplateDto {
  wabaId: string;
  templateName: string;
  category: 'MARKETING' | 'UTILITY';
  language: string;
  bodyText: string;
  buttonText: string;
  flowId?: string;
  flowName?: string;
  flowJson?: string;
  accessToken?: string;
}

@Controller('flow-message')
export class FlowMessageController {
  constructor(private readonly flowMessageService: FlowMessageService) {}

  @Post('send/:phoneNumberId')
  async sendFlowMessage(
    @Param('phoneNumberId') phoneNumberId: string,
    @Body() dto: SendFlowMessageDto
  ) {
    return this.flowMessageService.sendFlowMessage(dto, phoneNumberId);
  }

  @Post('send-template/:phoneNumberId')
  async sendFlowTemplate(
    @Param('phoneNumberId') phoneNumberId: string,
    @Body() dto: SendFlowTemplateDto
  ) {
    return this.flowMessageService.sendFlowTemplate(dto, phoneNumberId);
  }

  @Post('create-template')
  async createFlowTemplate(@Body() dto: CreateFlowTemplateDto) {
    return this.flowMessageService.createFlowTemplate(
      dto.wabaId,
      dto.templateName,
      dto.category,
      dto.language,
      dto.bodyText,
      dto.buttonText,
      dto.flowId,
      dto.flowName,
      dto.flowJson,
      dto.accessToken
    );
  }

  @Post('send-appointment/:phoneNumberId')
  async sendAppointmentFlow(
    @Param('phoneNumberId') phoneNumberId: string,
    @Body('to') to: string
  ) {
    return this.flowMessageService.sendAppointmentFlow(to, phoneNumberId);
  }

  @Get('test')
  testEndpoint() {
    return {
      message: 'Flow Message service is running',
      endpoints: [
        'POST /flow-message/send/:phoneNumberId - Send interactive flow message',
        'POST /flow-message/send-template/:phoneNumberId - Send flow template',
        'POST /flow-message/create-template - Create flow template',
        'POST /flow-message/send-appointment/:phoneNumberId - Send appointment flow'
      ]
    };
  }
}