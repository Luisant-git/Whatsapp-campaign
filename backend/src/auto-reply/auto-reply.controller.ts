import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Session } from '@nestjs/common';
import { AutoReplyService } from './auto-reply.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('auto-reply')
@UseGuards(SessionGuard)
export class AutoReplyController {
  constructor(private readonly autoReplyService: AutoReplyService) {}

  @Get()
  getAllAutoReplies(@Session() session: any) {
    return this.autoReplyService.getAllAutoReplies(session.user.id);
  }

  @Post()
  addAutoReply(@Session() session: any, @Body() body: { triggers: string[]; response: string }) {
    return this.autoReplyService.addAutoReply(session.user.id, body.triggers, body.response);
  }

  @Put(':id')
  updateAutoReply(@Session() session: any, @Param('id') id: string, @Body() body: { triggers: string[]; response: string; isActive: boolean }) {
    return this.autoReplyService.updateAutoReply(parseInt(id), session.user.id, body.triggers, body.response, body.isActive);
  }

  @Delete(':id')
  removeAutoReply(@Session() session: any, @Param('id') id: string) {
    return this.autoReplyService.removeAutoReply(parseInt(id), session.user.id);
  }
}