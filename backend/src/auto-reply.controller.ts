import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { AutoReplyService } from './auto-reply.service';

@Controller('auto-reply')
export class AutoReplyController {
  constructor(private readonly autoReplyService: AutoReplyService) {}

  @Get()
  getAllAutoReplies() {
    return this.autoReplyService.getAllAutoReplies(1); // hardcoded userId for testing
  }

  @Post()
  addAutoReply(@Body() body: { triggers: string[]; response: string }) {
    return this.autoReplyService.addAutoReply(1, body.triggers, body.response);
  }

  @Put(':id')
  updateAutoReply(@Param('id') id: string, @Body() body: { triggers: string[]; response: string; isActive: boolean }) {
    return this.autoReplyService.updateAutoReply(parseInt(id), 1, body.triggers, body.response, body.isActive);
  }

  @Delete(':id')
  removeAutoReply(@Param('id') id: string) {
    return this.autoReplyService.removeAutoReply(parseInt(id), 1);
  }
}