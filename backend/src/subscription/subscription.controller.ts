import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Session } from '@nestjs/common';
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

  @Get('current')
  @UseGuards(SessionGuard)
  getCurrentPlan(@Session() session: any) {
    return this.subscriptionService.getCurrentPlan(session.user.id);
  }

  @Get('my-orders')
  @UseGuards(SessionGuard)
  getUserOrders(@Session() session: any) {
    return this.subscriptionService.getUserOrders(session.user.id);
  }

  @Get('users')
  @UseGuards(SessionGuard)
  getAllUserSubscriptions() {
    return this.subscriptionService.getAllUserSubscriptions();
  }

  @Get('orders/all')
  @UseGuards(SessionGuard)
  getAllOrders() {
    return this.subscriptionService.getAllOrders();
  }

  @Put('orders/:id/status')
  @UseGuards(SessionGuard)
  updateOrderStatus(@Param('id') id: string, @Body() data: { status: string }) {
    return this.subscriptionService.updateOrderStatus(+id, data.status);
  }

  @Put('set-current/:orderId')
  @UseGuards(SessionGuard)
  setCurrentPlan(@Session() session: any, @Param('orderId') orderId: string) {
    return this.subscriptionService.setCurrentPlan(session.user.id, +orderId);
  }

  @Post('subscribe/:planId')
  @UseGuards(SessionGuard)
  subscribe(@Session() session: any, @Param('planId') planId: string) {
    return this.subscriptionService.subscribe(session.user.id, +planId);
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
