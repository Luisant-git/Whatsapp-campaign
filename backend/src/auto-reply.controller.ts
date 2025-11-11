import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { AutoReplyService } from './auto-reply.service';

@Controller('auto-reply')
export class AutoReplyController {
  constructor(private readonly autoReplyService: AutoReplyService) {}

  @Get()
  getAllAutoReplies() {
    return this.autoReplyService.getAllAutoReplies();
  }

  @Post()
  addAutoReply(@Body() body: { trigger: string; response: string }) {
    this.autoReplyService.addAutoReply(body.trigger, body.response);
    return { message: 'Auto-reply added successfully' };
  }

  @Delete(':trigger')
  removeAutoReply(@Param('trigger') trigger: string) {
    const removed = this.autoReplyService.removeAutoReply(trigger);
    return { 
      message: removed ? 'Auto-reply removed successfully' : 'Auto-reply not found' 
    };
  }
}