import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @UseGuards(SessionGuard)
  create(@Body() data: any) {
    return this.subscriptionService.create(data);
  }

  @Get()
  findAll() {
    return this.subscriptionService.findAll();
  }

  @Get('active')
  findActive() {
    return this.subscriptionService.findActive();
  }

  @Get(':id')
  @UseGuards(SessionGuard)
  findOne(@Param('id') id: string) {
    return this.subscriptionService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(SessionGuard)
  update(@Param('id') id: string, @Body() data: any) {
    return this.subscriptionService.update(+id, data);
  }

  @Delete(':id')
  @UseGuards(SessionGuard)
  remove(@Param('id') id: string) {
    return this.subscriptionService.remove(+id);
  }
}
