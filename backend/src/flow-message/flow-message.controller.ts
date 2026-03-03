import { Controller, Post, Get, Body, HttpCode, UseGuards, Session, Param, Put, Delete } from '@nestjs/common';
import { FlowMessageService } from './flow-message.service';
import { FlowTriggerService } from './flow-trigger.service';
import { SessionGuard } from '../auth/session.guard';
import type { SendFlowDto, FlowResponse } from './flow-message.types';

@Controller('flow-messages')
export class FlowMessageController {
  constructor(
    private readonly flowMessageService: FlowMessageService,
    private readonly flowTriggerService: FlowTriggerService,
  ) {}

  @Get('flows')
  @UseGuards(SessionGuard)
  getAvailableFlows() {
    return this.flowMessageService.getAvailableFlows();
  }

  @Post('send')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async sendFlowMessage(@Body() sendFlowDto: SendFlowDto): Promise<FlowResponse> {
    return this.flowMessageService.sendFlowToNumbers(sendFlowDto);
  }

  @Get('sent-history')
  @UseGuards(SessionGuard)
  getSentHistory() {
    return this.flowMessageService.getSentHistory();
  }

  // Flow Trigger endpoints
  @Post('triggers')
  @UseGuards(SessionGuard)
  async createTrigger(@Session() session: any, @Body() data: any) {
    return this.flowTriggerService.createTrigger(session.user.id, data);
  }

  @Get('triggers')
  @UseGuards(SessionGuard)
  async getTriggers(@Session() session: any) {
    return this.flowTriggerService.getTriggers(session.user.id);
  }

  @Get('triggers/:id')
  @UseGuards(SessionGuard)
  async getTrigger(@Session() session: any, @Param('id') id: string) {
    return this.flowTriggerService.getTrigger(parseInt(id), session.user.id);
  }

  @Put('triggers/:id')
  @UseGuards(SessionGuard)
  async updateTrigger(@Session() session: any, @Param('id') id: string, @Body() data: any) {
    return this.flowTriggerService.updateTrigger(parseInt(id), session.user.id, data);
  }

  @Delete('triggers/:id')
  @UseGuards(SessionGuard)
  async deleteTrigger(@Session() session: any, @Param('id') id: string) {
    return this.flowTriggerService.deleteTrigger(parseInt(id), session.user.id);
  }

  @Get('triggers/:id/logs')
  @UseGuards(SessionGuard)
  async getTriggerLogs(@Session() session: any, @Param('id') id: string) {
    return this.flowTriggerService.getTriggerLogs(parseInt(id), session.user.id);
  }
}