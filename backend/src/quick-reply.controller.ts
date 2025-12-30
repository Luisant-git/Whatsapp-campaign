import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { QuickReplyService } from './quick-reply.service';

@Controller('quick-reply')
export class QuickReplyController {
  constructor(private readonly quickReplyService: QuickReplyService) {}

  @Get()
  getAllQuickReplies() {
    return this.quickReplyService.getAllQuickReplies(1);
  }

  @Post()
  addQuickReply(@Body() body: { trigger: string; buttons: Array<{title: string, payload: string}> }) {
    return this.quickReplyService.addQuickReply(1, body.trigger, body.buttons);
  }

  @Put(':id')
  updateQuickReply(@Param('id') id: string, @Body() body: { trigger: string; buttons: Array<{title: string, payload: string}>; isActive: boolean }) {
    return this.quickReplyService.updateQuickReply(parseInt(id), 1, body.trigger, body.buttons, body.isActive);
  }

  @Delete(':id')
  removeQuickReply(@Param('id') id: string) {
    return this.quickReplyService.removeQuickReply(parseInt(id), 1);
  }
}