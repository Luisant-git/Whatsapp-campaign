// src/group/group.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Session, UseGuards } from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { SessionGuard } from '../auth/session.guard';

@Controller('group')
@UseGuards(SessionGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  // Helper to get userId from session
  private getUserId(session: Record<string, any>): number {
    const userId = session.userId || session.user?.id;
    if (!userId) throw new Error('User session not found');
    return userId;
  }

  @Post()
  create(@Body() createGroupDto: CreateGroupDto, @Session() session: Record<string, any>) {
    return this.groupService.create(createGroupDto, this.getUserId(session));
  }

  @Get()
  findAll(@Session() session: Record<string, any>) {
    return this.groupService.findAll(this.getUserId(session));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Session() session: Record<string, any>) {
    return this.groupService.findOne(+id, this.getUserId(session));
  }

  
  @Delete(':id')
  remove(@Param('id') id: string, @Session() session: Record<string, any>) {
    return this.groupService.remove(+id, this.getUserId(session));
  }
}
