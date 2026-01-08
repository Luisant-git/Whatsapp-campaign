import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Session } from '@nestjs/common';
import { QuickReplyService } from './quick-reply.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('quick-reply')
@UseGuards(SessionGuard)
export class QuickReplyController {
  constructor(private readonly quickReplyService: QuickReplyService) {}

  @Get()
  getAllQuickReplies(@Session() session: any) {
    return this.quickReplyService.getAllQuickReplies(session.user.id);
  }

  @Post()
  addQuickReply(@Session() session: any, @Body() body: { triggers: string[]; buttons: string[] }) {
    return this.quickReplyService.addQuickReply(session.user.id, body.triggers, body.buttons);
  }

  @Put(':id')
  updateQuickReply(@Session() session: any, @Param('id') id: string, @Body() body: { triggers: string[]; buttons: string[]; isActive: boolean }) {
    return this.quickReplyService.updateQuickReply(parseInt(id), session.user.id, body.triggers, body.buttons, body.isActive);
  }

  @Delete(':id')
  removeQuickReply(@Session() session: any, @Param('id') id: string) {
    return this.quickReplyService.removeQuickReply(parseInt(id), session.user.id);
  }
}