import { Controller, Get, Post, Body, Param, Delete, UseGuards, Patch } from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { SessionGuard } from '../auth/session.guard';
import { TenantContext } from '../tenant/tenant.decorator';
import type { TenantContext as TenantContextType } from '../tenant/tenant.decorator';

@Controller('group')
@UseGuards(SessionGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  create(@Body() createGroupDto: CreateGroupDto, @TenantContext() ctx: TenantContextType) {
    return this.groupService.create(createGroupDto, ctx);
  }

  @Get()
  findAll(@TenantContext() ctx: TenantContextType) {
    return this.groupService.findAll(ctx);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantContext() ctx: TenantContextType) {
    return this.groupService.findOne(+id, ctx);
  }  
  
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name: string },
    @TenantContext() ctx: TenantContextType
  ) {
    return this.groupService.update(+id, body.name, ctx);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantContext() ctx: TenantContextType) {
    return this.groupService.remove(+id, ctx);
  }
}
