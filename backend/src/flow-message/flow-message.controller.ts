import { Controller, Post, Get, Body, HttpCode } from '@nestjs/common';
import { FlowMessageService } from './flow-message.service';
import type { SendFlowDto, FlowResponse } from './flow-message.types';

@Controller('flow-messages')
export class FlowMessageController {
  constructor(private readonly flowMessageService: FlowMessageService) {}

  @Get('flows')
  getAvailableFlows() {
    return this.flowMessageService.getAvailableFlows();
  }

  @Post('send')
  @HttpCode(200)
  async sendFlowMessage(@Body() sendFlowDto: SendFlowDto): Promise<FlowResponse> {
    return this.flowMessageService.sendFlowToNumbers(sendFlowDto);
  }

  @Get('sent-history')
  getSentHistory() {
    return this.flowMessageService.getSentHistory();
  }
}