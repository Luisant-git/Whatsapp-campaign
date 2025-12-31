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
  addQuickReply(@Body() body: { triggers: string[]; buttons: string[] }) {
    return this.quickReplyService.addQuickReply(1, body.triggers, body.buttons);
  }

  @Put(':id')
  updateQuickReply(@Param('id') id: string, @Body() body: { triggers: string[]; buttons: string[]; isActive: boolean }) {
    return this.quickReplyService.updateQuickReply(parseInt(id), 1, body.triggers, body.buttons, body.isActive);
  }

  @Delete(':id')
  removeQuickReply(@Param('id') id: string) {
    return this.quickReplyService.removeQuickReply(parseInt(id), 1);
  }
}